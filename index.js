const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 8000

// middleware
// const corsOptions = {
//   origin: ['http://localhost:5173', 'https://elite-building.web.app'],
//   credentials: true,
//   optionSuccessStatus: 200,
// }
// app.use(cors(corsOptions))

 app.use (cors({origin:["http://localhost:5173","https://elite-building.web.app"]}))
// middleware
//app.use(cors());


app.use(express.json())
app.use(cookieParser())

// Verify Token Middleware
// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token
//   console.log(token)
//   if (!token) {
//     return res.status(401).send({ message: 'unauthorized access' })
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log(err)
//       return res.status(401).send({ message: 'unauthorized access' })
//     }
//     req.user = decoded
//     next()
//   })
// }

//const { MongoClient, ServerApiVersion } = require('mongodb');
//const uri = "mongodb+srv://monircom:<password>@cluster0.bkwszd0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkwszd0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const db = client.db('eliteDB')
    const apartmentsCollection = db.collection('apartments')
    const usersCollection = db.collection('users')
    const couponsCollection = db.collection('coupons')
    const announcementsCollection = db.collection('announcements')
    const bookingsCollection = db.collection('bookings')


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // save a user data in db
    app.put('/user', async (req, res) => {
      const user = req.body

      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query)
      if (isExist) {
        if (user.status === 'Requested') {
          // if existing user try to change his role
          const result = await usersCollection.updateOne(query, {
            $set: { status: user?.status },
          })
          return res.send(result)
        } else {
          // if existing user login again
          return res.send(isExist)
        }
        return res.send(isExist)
      }

      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      // welcome new user
      // sendEmail(user?.email, {
      //   subject: 'Welcome to Stayvista!',
      //   message: `Hope you will find you destination`,
      // })
      res.send(result)
    })
    // get a user info by email from db
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // get all users data from db
    app.get('/users', async (req, res) => {
      const role = "User"
      let query = {role}
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    //update a user role
    app.patch('/users/update/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email }
      const updateDoc = {
        $set: { ...user, timestamp: Date.now() },
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // Get all apartments from db
      app.get('/apartments', async (req, res) => {
        //const category = req.query.category
        //console.log(category)
        let query = {}
        //if (category && category !== 'null') query = { category }
        const result = await apartmentsCollection.find(query).toArray()
        res.send(result)
      })

      // Get a single apartment data from db using _id
      app.get('/apartment/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await apartmentsCollection.findOne(query)
        res.send(result)
      })  

        // Save a coupon data in db
        app.post('/coupon',  async (req, res) => {
          const couponData = req.body
          const result = await couponsCollection.insertOne(couponData)
          res.send(result)
        })

    // get all coupons for Admin
    app.get(
      '/my-coupons/:email', async (req, res) => {
        const email = req.params.email
        let query = { email }
        const result = await couponsCollection.find(query).toArray()
        res.send(result)
      }
    )
    // get all coupons for Home
    app.get('/coupons', async (req, res) => {         
      const result = await couponsCollection.find().toArray()
      res.send(result)
    })
    

  // delete a coupon
  app.delete('/coupon/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await couponsCollection.deleteOne(query)
    res.send(result)
  })    


        // Save a Announcement data in db
        app.post('/announcement',  async (req, res) => {
          const announcementData = req.body
          const result = await announcementsCollection.insertOne(announcementData)
          res.send(result)
        })

    // get all announcements for Admin
    app.get(
      '/my-announcements/:email', async (req, res) => {
        const email = req.params.email
        let query = { email }
        const result = await announcementsCollection.find(query).toArray()
        res.send(result)
      }
    )
    // get all announcements for Home
    app.get('/announcements', async (req, res) => {         
      const result = await announcementsCollection.find().toArray()
      res.send(result)
    })
    

  // delete a announcement
  app.delete('/announcement/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await announcementsCollection.deleteOne(query)
    res.send(result)
  })    


      // Save a applied data in db
      app.post('/applied', async (req, res) => {
        const appliedData = req.body
  
        // check if its a duplicate request
        const query = {
          email: appliedData.email,
          postId: appliedData.postId,
        }
        const alreadyApplied = await bookingsCollection.findOne(query)        
        console.log(alreadyApplied)        
        if (alreadyApplied) {
          return res
            .status(400)
            .send('You have already Applied for this apartment.')
        }

        //console.log(appliedData.postId,"postId")
        const result = await bookingsCollection.insertOne(appliedData)
  
        // update volunteer count in posts collection
        // const updateDoc = {
        //   $inc: { no_of_volunteers_needed: -1 },
        // }
        // const jobQuery = { _id: new ObjectId(appliedData.postId) }
        // const updateVolCount = await postsCollection.updateOne(jobQuery, updateDoc)
        // console.log(updateVolCount,"Update")
        res.send(result)
      })

    // get all agreement pending data from db
    app.get('/agreements', async (req, res) => {
      const status = "pending"
      let query = {status}
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })









    // // auth related api
    // app.post('/jwt', async (req, res) => {
    //   const user = req.body
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: '365d',
    //   })
    //   res
    //     .cookie('token', token, {
    //       httpOnly: true,
    //       secure: process.env.NODE_ENV === 'production',
    //       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    //     })
    //     .send({ success: true })
    // })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })
    // Get all apartments data from db for pagination
    app.get('/all-apertments', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const filter = req.query.filter
      const sort = req.query.sort
      const search = req.query.search
      console.log(size, page)

      let query = {
        floor_no: { $regex: search, $options: 'i' },
      }
      if (filter) query.category = filter
      let options = {}
      if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
      const result = await apartmentsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray()

      res.send(result)
    })

    // Get all apartments data count from db
    app.get('/aprtments-count', async (req, res) => {
      const filter = req.query.filter
      const search = req.query.search
      let query = {
        floor_no: { $regex: search, $options: 'i' },
      }
      if (filter) query.category = filter
      const count = await apartmentsCollection.countDocuments(query)

      res.send({ count })
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from EliteBuilding Server..')
})

app.listen(port, () => {
  console.log(`EliteBuilding is running on port ${port}`)
})
