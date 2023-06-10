const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
var cors = require('cors')
const port =process.env.PORT ||5000

// middleware 
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.MI_NAME}:${process.env.MI_PASS}@cluster0.1n864lk.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);+ 

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const database = client.db("Fashion-design");
    const popularClass = database.collection("popular-classes");
    const instructorClass = database.collection("instructor");

//  popular classes 
app.get("/popularClass" , async(req , res )=>{
  const result =await popularClass.find().sort({"students":-1}).toArray()
  res.send(result)
})

// Instructor 
app.get("/instructorClass" , async(req , res )=>{
  const result =await instructorClass.find().sort({"students":-1}).toArray()
  res.send(result)
})

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Fashion Design is running')
})

app.listen(port, () => {
  console.log(`Fashion Design listening on port ${port}`)
})