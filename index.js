
import express from "express";
import "dotenv/config";
import { MongoClient } from "mongodb";

// ============================================
// 1. EXPRESS SERVER CONFIGURATION
// ============================================

const app = express();
const port = process.env.PORT || 5000;


// ============================================
// 2. MIDDLEWARE
// ============================================

// Parse incoming JSON request bodies.
app.use(express.json());


// ============================================
// 3. MONGODB CLIENT CONFIGURATION
// ============================================

// Read MongoDB credentials securely from .env.
const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tcyjszt.mongodb.net/`
);


// ============================================
// 4. MONGODB CONNECTION
// ============================================

// Establish a connection with MongoDB Atlas.
async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("MongoDB connected successfully!");

    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}


// ============================================
// 5. DATABASE CONFIGURATION
// ============================================

// Connect to MongoDB and select the FixMate database.
const databaseConnection = await connectToMongoDB();
const database = databaseConnection.db("fixmate9");


// ============================================
// 6. DATABASE COLLECTIONS
// ============================================

// User authentication and profile information.
const users = database.collection("user");

// Technician service listings.
const services = database.collection("services");

// Customer repair booking information.
const bookings = database.collection("bookings");

// Customer payment records.
const payments = database.collection("payments");


// ============================================
// 7. SERVER HEALTH CHECK API
// ============================================

// Check whether the FixMate backend is running.
app.get("/", (req, res) => {
  res.status(200).send("FixMate Server is Running!");
});


// ============================================
// 8. START EXPRESS SERVER
// ============================================

app.listen(port, () => {
  console.log(`FixMate server is running on port ${port}`);
});
