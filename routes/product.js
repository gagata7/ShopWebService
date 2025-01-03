const express = require("express");
const router = express.Router();

const pool = require("../config/db_setup");

// products list page
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products");
    const user = req.session.user;
    res.render("products", { products: rows, user: user });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// searching up a product by name or description
router.get("/search", async (req, res) => {
  const { query } = req.query;
  try {
    let matchingProducts = [];
    if (query) {
      const { rows } = await pool.query(
        "SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1",
        [`%${query}%`]
      );
      matchingProducts = rows;
    }
    res.render("product_search", {
      products: matchingProducts,
      searchQuery: query || "",
    });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// adding a new product to the database
router.get("/add", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  res.render("add_product");
});

router.post("/add", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  const { name, description, price } = req.body;
  try {
    await pool.query(
      "INSERT INTO products (name, description, price) VALUES ($1, $2, $3)",
      [name, description, price]
    );
    res.redirect("/products");
  } catch (err) {
    res.status(400).send("Error:" + err.message);
  }
});

// removing a product from the whole database
router.get("/remove", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  res.render("delete_product");
});

router.post("/remove", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  const { productId } = req.body;
  try {
    // first, remove the product from the carts
    await pool.query("DELETE FROM carts WHERE product_id = $1", [productId]);

    // then, remove the product from the products table
    await pool.query("DELETE FROM products WHERE id = $1", [productId]);
    res.redirect("/products");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// editing a product
router.get("/edit/:id", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  const { id } = req.params;
  try {
    const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [
      id,
    ]);
    res.render("edit_product", { product: rows[0] });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

router.put("/edit", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  const { productId, name, description, price } = req.body;
  try {
    await pool.query(
      "UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4",
      [name, description, price, productId]
    );
    res.redirect("/products");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

module.exports = router;
