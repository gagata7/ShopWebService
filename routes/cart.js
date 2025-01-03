const express = require("express");
const router = express.Router();

const pool = require("../config/db_setup");

// listing cart items
router.get("", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Content available only for logged in users.");
  }
  try {
    const { rows } = await pool.query(
      "SELECT products.*, carts.quantity FROM products JOIN carts ON products.id = carts.product_id WHERE carts.user_id = $1",
      [req.session.user.id]
    );
    res.render("cart", { products: rows });
  } catch (err) {
    res.status(500).send("Error" + err.message);
  }
});

// adding up an item to the cart

router.post("/add", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Content available only for logged in users.");
  }
  const { productId, quantity } = req.body;
  try {
    await pool.query(
      "INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)",
      [req.session.user.id, productId, quantity || 1]
    );
    res.redirect("/cart");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// removing an item from the cart

router.post("/remove", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Content available only for logged in users.");
  }
  const { productId } = req.body;
  try {
    await pool.query(
      "DELETE FROM carts WHERE user_id = $1 AND product_id = $2",
      [req.session.user.id, productId]
    );
    res.redirect("/cart");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// checkout the cart
router.post("/checkout", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Content available only for logged in users.");
  }
  try {
    // Check if cart is not empty
    const { rows } = await pool.query(
      "SELECT * FROM carts WHERE user_id = $1",
      [req.session.user.id]
    );

    // create new order
    const { rows: newOrderRows } = await pool.query(
      "INSERT INTO orders (user_id) VALUES ($1) RETURNING id",
      [req.session.user.id]
    );
    const orderId = newOrderRows[0].id;

    // move cart items to order_items
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity)
       SELECT $1, product_id, quantity FROM carts WHERE user_id = $2`,
      [orderId, req.session.user.id]
    );

    // clear the cart
    await pool.query("DELETE FROM carts WHERE user_id = $1", [
      req.session.user.id,
    ]);

    res.redirect("/products");
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

module.exports = router;
