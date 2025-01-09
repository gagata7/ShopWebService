const http = require("http");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const methodOverride = require("method-override");
const pool = require("./config/db_setup"); // setup the database first

const app = express();

// set ejs as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// adding middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "sekret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 300000, // user will be logged out after 5 minutes
    },
  })
);

const adminRoutes = require("./routes/admin");
const cartRoutes = require("./routes/cart");
const indexRoutes = require("./routes/index");
const productRoutes = require("./routes/product");
const userRoutes = require("./routes/user");

app.use("/admin", adminRoutes);
app.use("/cart", cartRoutes);
app.use("/", indexRoutes);
app.use("/products", productRoutes);
app.use("/users", userRoutes);

// start the server and listen on port 3000
server = http.createServer(app);
server.listen(process.env.PORT || 3000, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Server is running on http://localhost:3000");
  }
});
