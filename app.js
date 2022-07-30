const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const compression = require("compression");
const morgan = require("morgan");
const flash = require("connect-flash");
const multer = require("multer");

const PORT = process.env.PORT || 3000;

const errorController = require("./controllers/error");
const User = require("./models/user");

const MONGO_DB_URI =
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.d96pl5j.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;
const app = express();

const store = new MongoDBStore({
  uri: MONGO_DB_URI,
  collection: "shopSessions",
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./images");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "shop" + "-" + uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");


const accessLogStream = fs.createWriteStream(path.join(__dirname,"access.log") , {
  flag:"a"
})

app.use(compression());
app.use(morgan("combined" , {
  stream : accessLogStream
}));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(express.static(path.join(__dirname, "public")));

app.use("./images", express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: "my-shopSecret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      // throw new Error('DummyErr');
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();

  next();
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  res.redirect("/500");
});

mongoose
  .connect(MONGO_DB_URI)
  .then((result) => {
    app.listen(PORT, () => {
      console.log(`Connected on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
