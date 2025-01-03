const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const methodOverride = require("method-override");
const pool = require("./config/db_setup");

const app = express();
const port = 3000;

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
      maxAge: 600000, // user will be logged out after 10 minutes
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

// run the server (with new, cleared session)
app.listen(port, () => {
  console.log(`Shop Web Service is running at http://localhost:${port}`);
});
