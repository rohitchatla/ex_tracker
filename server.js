"use strict";

const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");

console.log(process.env.mongoURI);
mongoose.connect(process.env.mongoURI, (err) => {
  if (err) return err;
  console.log("Mongo_ose is connected");
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

/***  my code */
//  create mongoDB schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  log: [
    {
      description: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      date: {
        type: Date,
        default: new Date().toUTCString(),
      },
    },
  ],
});
//  create a model of this schema
const User = mongoose.model("User", userSchema);

app.route("/api/users").post((req, res) => {
  ///api/new-user
  // /api/users
  // if(req.body.username)
  User.findOne({ username: req.body.username }, (err, user) => {
    if (user) {
      return res.send("username already taken");
    }
    new User({ username: req.body.username })
      .save()
      .then((doc) => res.json({ username: doc.username, _id: doc.id }))
      .catch((err) => res.json(err));
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, "username id")
    .then((docs) => {
      res.json(docs);
    })
    .catch((err) => res.json(err));
});

app.post("/api/exercise/add", (req, res) => {
  // /api/users/:id/exercises
  const logger = {
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date,
  };
  User.findByIdAndUpdate(
    req.body.userId,
    { $push: { log: logger } },
    { new: true }
  )
    .exec()
    .then((user) => {
      //console.log(user);
      res.json({
        id: user.id,
        username: user.username,
        log: user.log[user.log.length - 1],
      });
    })
    .catch((err) => {
      console.log("error");
      //console.log(err);
      res.json(err);
    });
});

app.get("/api/users/:id/logs", (req, res) => {
  User.findById(req.params.id)
    .exec()
    .then((user) => {
      console.log(user);
      let obj = {
        logs: user.log,
        count: user.log.length,
      };
      res.json(obj);
    });
});

app.get("/api/users/logs" /*?{userId}[&from][&to][&limit]*/, (req, res) => {
  //http://localhost:3000/api/users/log?userId=22
  ///api/users/:id/logs
  console.log(req.query);
  console.log(new Date(req.query.from).getTime());
  User.findById(req.query.userId)
    .exec()
    .then((user) => {
      console.log(user);
      let newLog = user.log;
      if (req.query.from) {
        newLog = newLog.filter((x) => {
          console.log(x.date.getTime());
          x.date.getTime() > new Date(req.query.from).getTime();
        });
        console.log(newLog);
      }
      if (req.query.to)
        newLog = newLog.filter(
          (x) => x.date.getTime() < new Date(req.query.to).getTime()
        );
      if (req.query.limit)
        newLog = newLog.slice(
          0,
          req.query.limit > newLog.length ? newLog.length : req.query.limit
        );
      user.log = newLog;
      let temp = user.toJSON();
      temp["count"] = newLog.length;

      return temp;
    })
    .then((result) => res.json(result))
    .catch((err) => res.json(err));
});
/***    */

// // Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3001, () => {
  //3000
  console.log("Your app is listening on port " + listener.address().port);
});

/*
router.post('/new-user', (req, res, next) => {
    const { username } = req.body;
    User.findOne({ username }).then(user => {
        if (user) throw new Error('username already taken');
        return User.create({ username })
    })
        .then(user => res.status(200).send({
            username: user.username,
            _id: user._id
        }))
        .catch(err => {
            console.log(err);
            res.status(500).send(err.message);
        })
})

router.post('/add', (req, res, next) => {
    let { userId, description, duration, date } = req.body;
    User.findOne({ _id: userId }).then(user => {
        if (!user) throw new Error('Unknown user with _id');
        date = date || Date.now();
        return Exercise.create({
            description, duration, date, userId
        })
            .then(ex => res.status(200).send({
                username: user.username,
                description, duration,
                _id: user._id,
                date: moment(ex.date).format('ddd MMMM DD YYYY')
            }))
    })
        .catch(err => {
            console.log(err);
            res.status(500).send(err.message);
        })
})

router.get('/log', (req, res, next) => {
    let { userId, from, to, limit } = req.query;
    from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
    to = moment(to, 'YYYY-MM-DD').isValid() ? moment(to, 'YYYY-MM-DD') : moment().add(1000000000000);
    User.findById(userId).then(user => {
        if (!user) throw new Error('Unknown user with _id');
        Exercise.find({ userId })
            .where('date').gte(from).lte(to)
            .limit(+limit).exec()
            .then(log => res.status(200).send({
                _id: userId,
                username: user.username,
                count: log.length,
                log: log.map(o => ({
                    description: o.description,
                    duration: o.duration,
                    date: moment(o).format('ddd MMMM DD YYYY')
                }))
            }))
    })
        .catch(err => {
            console.log(err);
            res.status(500).send(err.message);
        })
})
*/
