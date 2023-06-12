const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
var cors = require('cors')
var jwt = require('jsonwebtoken');
const port =process.env.PORT ||5000

// middleware 
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}




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
    const userCollection = database.collection("users");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

      res.send({ token })
    })

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

// user 

app.get("/user" , async(req , res)=>{
  const result = await userCollection.find().toArray()
  res.send(result)
})


app.post("/user" ,async(req , res)=>{
  const user = req.body ;
  const query = { email:user.email };
  const existingUser = await userCollection.findOne(query)
      console.log( "existing user" ,existingUser);

      if(existingUser){
        return res.send({massage: " user already exists"})
      }
  const result = await userCollection.insertOne(user);
  res.send(result)
})

// make admin 
app.patch('/user/admin/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'admin'
    },
  };

  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);

}) 

// make Instructor 
app.patch('/user/instructor/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'instructor'
    },
  };

  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);

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