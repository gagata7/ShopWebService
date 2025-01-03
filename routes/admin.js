const express = require("express");
const router = express.Router();

const pool = require("../config/db_setup");

// listing all users in the database
router.get("/users", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  try {
    const { rows } = await pool.query("SELECT * FROM users");
    res.render("users", { users: rows });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// list submitted orders
router.get("/placed", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  try {
    const { rows } = await pool.query(
      `SELECT 
          o.id AS order_id, 
          o.user_id, 
          u.username AS user_name, 
          o.created_at, 
          oi.product_id, 
          p.name AS product_name, 
          p.description AS product_description, 
          p.price AS product_price, 
          oi.quantity
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id`
    );
    res.render("orders", { orders: rows });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// list open orders (still in carts but not submitted)
router.get("/open", async (req, res) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(401).send("Content available only for privileged users.");
  }
  try {
    const { rows } = await pool.query(
      `SELECT 
            c.user_id,
            array_agg(c.product_id) AS product_ids,
            u.username AS user_name,
            SUM(p.price * c.quantity) AS total_price,
            SUM(c.quantity) AS total_quantity
        FROM carts c
        JOIN products p ON c.product_id = p.id
        JOIN users u ON c.user_id = u.id
        GROUP BY c.user_id, u.username
        ORDER BY user_name;`
    );
    res.render("open_orders", { orders: rows });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

module.exports = router;
