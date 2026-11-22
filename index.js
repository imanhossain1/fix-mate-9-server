import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`
);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

await connectToMongoDB();

// ========================================
// FixMate Database & Collections
// ========================================
const database = client.db('fixmate9');

const usersCollection = database.collection("user");
const servicesCollection = database.collection("services");
const repairRequestsCollection = database.collection("repairRequests"); // বা bookings
const reviewsCollection = database.collection("reviews");
const paymentsCollection = database.collection("payments");

// ========================================
// Routes
// ========================================
app.get('/', (req, res) => {
  res.send('FixMate Server is Running!');
});

// Users
app.get('/users', async (req, res) => {
  const result = await usersCollection.find({}).toArray();
  res.send(result);
});

app.post('/users', async (req, res) => {
  const newUser = req.body;
  const result = await usersCollection.insertOne(newUser);
  res.status(201).send(result);
});

// Services (যেসব মেরামত বা সার্ভিস অফার করা হয়)
app.get('/services', async (req, res) => {
  const result = await servicesCollection.find({}).toArray();
  res.send(result);
});

app.post('/services', async (req, res) => {
  const service = req.body;
  const result = await servicesCollection.insertOne(service);
  res.status(201).send(result);
});

// Repair Requests / Bookings (কাস্টমারের সার্ভিস রিকোয়েস্ট বা বুকিং)
app.get('/repair-requests', async (req, res) => {
  const result = await repairRequestsCollection.find({}).toArray();
  res.send(result);
});

app.post('/repair-requests', async (req, res) => {
  const requestData = {
    ...req.body,
    status: req.body.status || "pending", // pending, assigned, in-progress, completed, cancelled
    createdAt: new Date(),
  };
  const result = await repairRequestsCollection.insertOne(requestData);
  res.status(201).send(result);
});

// Reviews & Payments (প্রয়োজন অনুযায়ী ব্যবহারের জন্য)
app.get('/reviews', async (req, res) => {
  const result = await reviewsCollection.find({}).toArray();
  res.send(result);
});

app.get('/payments', async (req, res) => {
  const result = await paymentsCollection.find({}).toArray();
  res.send(result);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`FixMate server listening on port ${port}`);
});