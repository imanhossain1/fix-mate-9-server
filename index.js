
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import 'dotenv/config'


const app = express();
const port = 5000;

app.use(express.json())
app.use(cors())

const client = new MongoClient(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tcyjszt.mongodb.net/`);
// bad auth 
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient =    await connectToMongoDB();
const database = client.db('fixmate9')
 const usersCollection = database.collection("user");
const servicesCollection = database.collection("services");
// const repairRequestsCollection = database.collection("repairRequests"); // বা bookings
// const reviewsCollection = database.collection("reviews");
// const paymentsCollection = database.collection("payments");


app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/users', async (req, res) => {
  const cursor =  usersCollection.find({})
  const result = await cursor.toArray()
  res.send(result)
});


app.post('/add-service', async (req, res) => {
  const service = req.body;
  console.log('service body', service);
  const result = await servicesCollection.insertOne(service);
  console.log(result,' post servies result ');
  
  res.status(201).send(result);
});


// // Services (যেসব মেরামত বা সার্ভিস অফার করা হয়)
// app.get('/services', async (req, res) => {
//   const result = await servicesCollection.find({}).toArray();
//   res.send(result);
// });


// // Repair Requests / Bookings (কাস্টমারের সার্ভিস রিকোয়েস্ট বা বুকিং)
// app.get('/repair-requests', async (req, res) => {
//   const result = await repairRequestsCollection.find({}).toArray();
//   res.send(result);
// });
// // Repair Requests / Bookings (কাস্টমারের সার্ভিস রিকোয়েস্ট বা বুকিং)
// app.get('/repair-requests', async (req, res) => {
//   const result = await repairRequestsCollection.find({}).toArray();
//   res.send(result);
// });

// app.post('/repair-requests', async (req, res) => {
//   const requestData = {
//     ...req.body,
//     status: req.body.status || "pending", // pending, assigned, in-progress, completed, cancelled
//     createdAt: new Date(),
//   };
//   const result = await repairRequestsCollection.insertOne(requestData);
//   res.status(201).send(result);
// });

// // Reviews & Payments (প্রয়োজন অনুযায়ী ব্যবহারের জন্য)
// app.get('/reviews', async (req, res) => {
//   const result = await reviewsCollection.find({}).toArray();
//   res.send(result);
// });

// app.get('/payments', async (req, res) => {
//   const result = await paymentsCollection.find({}).toArray();
//   res.send(result);
// });



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});