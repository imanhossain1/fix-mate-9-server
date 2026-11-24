
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

// MongoDB Connection
const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`
);

await client.connect();
console.log("MongoDB Connected Successfully");

const database = client.db("fixmate9");

const usersCollection = database.collection("user");
const servicesCollection = database.collection("services");
const bookingsCollection = database.collection("bookings");

// Home
app.get("/", (req, res) => {
  res.send("FixMate Server Running");
});

// Get Users
app.get("/users", async (req, res) => {
  const result = await usersCollection.find({}).toArray();
  res.send(result);
});

// Add Service
app.post("/add-service", async (req, res) => {
  const result = await servicesCollection.insertOne(req.body);
  res.status(201).send(result);
});

// Get All Services
app.get("/services", async (req, res) => {
  const result = await servicesCollection.find({}).toArray();
  res.send(result);
});

// Get Single Service By ID
app.get("/services/:id", async (req, res) => {
  const result = await servicesCollection.findOne({
    _id: new ObjectId(req.params.id),
  });

  res.send(result);
});

// Create Booking
app.post("/bookings", async (req, res) => {
  const data = req.body;

  const service = await servicesCollection.findOne({
    _id: new ObjectId(data.serviceId),
    approvalStatus: "approved",
    isAvailable: true,
  });

  if (!service) {
    return res.status(404).send({
      message: "Service not available",
    });
  }

  const bookingData = {
    serviceId: service._id.toString(),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,

    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,

    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,

    address: data.address,
    preferredDate: data.preferredDate,
    problemDescription: data.problemDescription,

    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    createdAt: new Date(),
  };

  const result = await bookingsCollection.insertOne(bookingData);

  res.status(201).send({
    success: true,
    message: "Booking successful",
    insertedId: result.insertedId,
  });
});

// Get Customer Bookings
app.get("/bookings/customer/:email", async (req, res) => {
  const result = await bookingsCollection.find({
    customerEmail: req.params.email,
  }).toArray();

  res.send(result);
});

// Get Technician Requests
app.get("/bookings/technician/:email", async (req, res) => {
  const result = await bookingsCollection.find({
    technicianEmail: req.params.email,
  }).toArray();

  res.send(result);
});

// =====================================
// ADMIN: Get All Services
// =====================================

app.get("/admin/services", async (req, res) => {
    const result = await servicesCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

    res.send(result);
});


// =====================================
// ADMIN: Approve or Reject Service
// =====================================

app.patch("/admin/services/:id/status", async (req, res) => {
    const id = req.params.id;
    const { approvalStatus } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
        return res.status(400).send({
            message: "Invalid approval status",
        });
    }

    const result = await servicesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: {
                approvalStatus: approvalStatus,
            },
        }
    );

    if (result.matchedCount === 0) {
        return res.status(404).send({
            message: "Service not found",
        });
    }

    res.send({
        success: true,
        message: `Service ${approvalStatus} successfully`,
    });
});

// Start Server
app.listen(port, () => {
  console.log(`FixMate Server running on port ${port}`);
});
