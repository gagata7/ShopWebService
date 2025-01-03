const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const pool = require("../config/db_setup");

// password encryption
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
}

// password verification
async function verifyPassword(password, hashed) {
  const isMatching = await bcrypt.compare(password, hashed);
  return isMatching;
}

// user registration form
router.get("/register", async (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      await hashPassword(password),
    ]);
    res.status(201).send("User registered successfully.");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// user logging in form
router.get("/login", async (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  if (rows.length > 0 && (await verifyPassword(password, rows[0].password))) {
    req.session.user = rows[0];
    res.redirect("/products");
  } else {
    res.status(401).send("Invalid username or password.");
  }
});

module.exports = router;
