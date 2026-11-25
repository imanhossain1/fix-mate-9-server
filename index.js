import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

// =====================================
// 1. DATABASE CONNECTION
// =====================================

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`
);

await client.connect();
console.log("MongoDB Connected Successfully");

const database = client.db("fixmate9");

const usersCollection = database.collection("user");
const servicesCollection = database.collection("services");
const bookingsCollection = database.collection("bookings");

// =====================================
// 2. COMMON / PUBLIC APIs
// =====================================

// Home
app.get("/", (req, res) => {
  res.send("FixMate Server Running");
});

// Get All Approved and Available Services
// app.get("/services", async (req, res) => {
//   const result = await servicesCollection
//     .find({
//       approvalStatus: "approved",
//       isAvailable: true,
//     })
//     .toArray();

//   res.send(result);
// });

// Get All Approved and Available Services (with optional ?category=)
app.get("/services", async (req, res) => {
  try {
    const { category } = req.query;

    const query = {
      approvalStatus: "approved",
      isAvailable: true,
    };

    if (category && category !== "All") {
      query.category = category;
    }

    const result = await servicesCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error("Get services error:", error);
    res.status(500).send({ message: "Failed to fetch services" });
  }
});

// Get Single Service By ID
app.get("/services/:id", async (req, res) => {
  const result = await servicesCollection.findOne({
    _id: new ObjectId(req.params.id),
  });

  res.send(result);
});

// =====================================
// 3. CUSTOMER APIs
// =====================================

// Customer: Create New Booking
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

// Customer: Get My Bookings
app.get("/bookings/customer/:email", async (req, res) => {
  const result = await bookingsCollection
    .find({
      customerEmail: req.params.email,
    })
    .toArray();

  res.send(result);
});

// =====================================
// 4. TECHNICIAN APIs
// =====================================

// Technician: Add New Service
app.post("/add-service", async (req, res) => {
  const result = await servicesCollection.insertOne(req.body);

  res.status(201).send(result);
});

// Technician: Get My Services
app.get("/services/technician/:email", async (req, res) => {
  const result = await servicesCollection
    .find({
      technicianEmail: req.params.email,
    })
    .toArray();

  res.send(result);
});

// Technician: Update My Service
app.patch("/services/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const result = await servicesCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updatedData,
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send({
      message: "Service not found",
    });
  }

  res.send({
    success: true,
    message: "Service updated successfully",
  });
});

// Technician: Delete My Service
app.delete("/services/:id", async (req, res) => {
  const id = req.params.id;

  const result = await servicesCollection.deleteOne({
    _id: new ObjectId(id),
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({
      message: "Service not found",
    });
  }

  res.send({
    success: true,
    message: "Service deleted successfully",
  });
});

// Technician: Get Assigned Booking Requests
app.get("/bookings/technician/:email", async (req, res) => {
  const result = await bookingsCollection
    .find({
      technicianEmail: req.params.email,
    })
    .toArray();

  res.send(result);
});

// Technician: Update Booking Status (Accept / Reject / Start Work / Complete)
app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const { status: nextStatus, finalAmount } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).send({
        success: false,
        message: "Booking not found",
      });
    }

    const allowedTransitions = {
      requested: ["accepted", "rejected"],
      accepted: ["in-progress"],
      "in-progress": ["completed"],
    };

    const allowedNext = allowedTransitions[booking.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).send({
        success: false,
        message: `Cannot change status from '${booking.status}' to '${nextStatus}'`,
      });
    }

    const updateDoc = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (nextStatus === "completed") {
      const numericAmount = Number(finalAmount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).send({
          success: false,
          message: "Final amount must be greater than 0",
        });
      }
      updateDoc.finalAmount = numericAmount;
    }

    await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    const updatedBooking = await bookingsCollection.findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).send({
      success: true,
      message: `Job marked as ${nextStatus}`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to update booking status",
    });
  }
});

// =====================================
// 5. ADMIN APIs
// =====================================

// Admin: Get All Users
app.get("/users", async (req, res) => {
  const result = await usersCollection.find({}).toArray();
  res.send(result);
});

// Admin: Get All Services
app.get("/admin/services", async (req, res) => {
  const result = await servicesCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});

// Admin: Approve or Reject Service
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

// Admin: Get All Bookings
app.get("/admin/bookings", async (req, res) => {
  const result = await bookingsCollection
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});

// Admin: Update User Role (Cannot change own role)
app.patch("/admin/users/:id/role", async (req, res) => {
  try {
    const id = req.params.id;
    const { role: nextRole, adminEmail } = req.body;

    const allowedRoles = ["customer", "technician", "admin"];
    if (!allowedRoles.includes(nextRole)) {
      return res.status(400).send({
        success: false,
        message: "Invalid role. Must be customer, technician, or admin",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid user ID",
      });
    }

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Admin নিজের রোল নিজে বদলাতে পারবে না
    if (
      adminEmail &&
      targetUser.email &&
      targetUser.email.toLowerCase() === adminEmail.toLowerCase()
    ) {
      return res.status(403).send({
        success: false,
        message: "You cannot change your own role",
      });
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          role: nextRole,
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).send({
      success: true,
      message: `User role updated to ${nextRole}`,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to update user role",
    });
  }
});


// Common: Update Logged-in User Profile (Customer / Technician / Admin)
app.patch("/users/profile", async (req, res) => {
  try {
    const { email, name, image } = req.body;

    if (!email || !name || !String(name).trim()) {
      return res.status(400).send({
        success: false,
        message: "Email and name are required",
      });
    }

    const cleanEmail = String(email).trim();
    const escapedEmail = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const emailRegex = new RegExp(`^${escapedEmail}$`, "i");

    const updateDoc = {
      name: String(name).trim(),
      updatedAt: new Date(),
    };

    if (typeof image === "string") {
      updateDoc.image = image.trim();
    }

    const result = await usersCollection.updateOne(
      { email: { $regex: emailRegex } },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await usersCollection.findOne({
      email: { $regex: emailRegex },
    });

    return res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to update profile",
    });
  }
});




// =====================================
// 6. START SERVER
// =====================================

app.listen(port, () => {
  console.log(`FixMate Server running on port ${port}`);
});