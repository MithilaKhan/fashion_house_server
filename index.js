const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require("jsonwebtoken");
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express());
app.use(express.json())

const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(4010).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.1n864lk.mongodb.net/?retryWrites=true&w=majority`;
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

    const usersCollection = client.db('sportsDB').collection('users');
    const classesCollection = client.db('sportsDB').collection('classes');
    const selectCollection = client.db('sportsDB').collection('select');
    const paymentCollection = client.db('sportsDB').collection('payment');

    // JWT post
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '2h' })
      res.send({ token })
    })

    // verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res

          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    //  verify Instructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };


    // user related apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })


    // verifyJWT,verifyAdmin, eita niche dithe hbe
    app.post('/users', async (req, res) => {
      const user = req.body;

    console.log(user);
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      console.log('existing user already ', existingUser)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    // Admin role
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // Instructor: verify jWt dithe hbe todo
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // User delete
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    // security layer: verifyJwt
    // email same
    // check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (!req.decoded.email) {
        res.send({ admin: false })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    // Instructor:
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // All Instructor classes api data
    app.post('/addClass', async (req, res) => {
      const query = req.body;
      const result = await classesCollection.insertOne(query);
      res.send(result);
    })

    // admin manage Users for APi show data all add instructor Class
    app.get('/allClasses', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })

    // home page Class and all Classes route this approve class show
    app.get('/allApprovedClasses/:text', async (req, res) => {
      const result = await classesCollection.find({ status: req.params.text }).toArray();
      res.send(result);

    })

    // Home page popular class show get api routes
    app.get('/popularClass/:status', async (req, res) => {
      console.log(req.params.status);
      // const query = { _id: }
      const limitClass = 6;
      const result = await classesCollection.find({ status: req.params.status }).sort({ student: -1 }).limit(limitClass).toArray();
      res.send(result);
    })

    // Admin deny and send feedback instructor class findOne
    app.put('/addClasses/:id', async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback; // Assuming the new seat value is provided in the request body

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $push: { feedback: feedback } // Push the new seat value to the "availableSeats" array field
      };

      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // only my All Class get api
    app.get('/myAllClass', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })

    // admin approved classes apis:
    app.patch('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const status = req.query.status;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        }
      };
      const result = await classesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Delete my class
    app.delete('/myClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.deleteOne(query);
      res.send(result)
    })

    // ok selected class get
    app.get('/selectClass', verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email)
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      const query = { email: email }
      const result = await selectCollection.find(query).toArray();
      res.send(result);
    })


    /* ---------------------------------
    // payment er jonno kaj start
      ------------------------------------*/
    // Id dore payment kaj baki new****
    app.get("/selectClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectCollection.findOne(query);
      res.send(result);
    });

    // select Class cats theke delete
    app.delete('/selectClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectCollection.deleteOne(query);
      res.send(result);
    })
// User Select button click to set mongodb
    app.post("/selectClass", async (req, res) => {
      const item = req.body;

      const result = await selectCollection.insertOne(item);
      return res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;

      const id = payment.id;
      console.log(id);
      const filter = { id: id };
      const query = {
        _id: new ObjectId(id),
      };
      const existingPayment = await paymentCollection.findOne(filter);
      if (existingPayment) {
        return res.send({ message: "Already Enrolled This Class" })
      }


      const insertResult = await paymentCollection.insertOne(payment);


      const deleteResult = await selectCollection.deleteOne(query);

      return res.send({ insertResult, deleteResult });
    });


    app.patch("/all-classes/seats/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateClass = await classesCollection.findOne(filter);
      if (!updateClass) {
        // Handle case when the seat is not found
        console.log("Seat not found");
        return;
      }
      const updateEnrollStudent = updateClass.student + 1;
      const updatedAvailableSeats = updateClass.seats - 1;
      const update = {
        $set: {
          seats: updatedAvailableSeats,
          student: updateEnrollStudent,
        },
      };
      const result = await classesCollection.updateOne(filter, update);
      res.send(result);
    });
    app.get('/payments', verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email, 353)
      if (!email) {
        return res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }
      const query = { email: email }
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
      res.send(result);
    })

  


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
   
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Sports academies server is running')
})


app.listen(port, () => {
  console.log(`sports server is running:${port}`)
})
