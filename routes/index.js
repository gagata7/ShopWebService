const path = require("path");
const express = require("express");
const router = express.Router();

// index page
router.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

module.exports = router;
