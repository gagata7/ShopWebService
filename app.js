const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// set ejs as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// adding middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'sekret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 60000 // user will be logged out after 1 minute
  }
}));

// postgreSQL database configuration
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'shop_webservice',
  password: 'haslo',
  port: 5432,
});

// setting up the whole database with its tables
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      product_id INT REFERENCES products(id),
      quantity INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id),
      product_id INT REFERENCES products(id),
      quantity INT NOT NULL
    );
  `);
}

initializeDatabase().then(() => console.log('Database initialized successfully.'));

// index page
app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});


// products list page
app.get('/products', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products');
        const user = req.session.user;
        res.render('products', { products: rows, user: user });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// searching up a product by name or description
app.get('/products/search', async (req, res) => {
  const { query } = req.query;
  try {
    let matchingProducts = [];
    if (query) {
      const { rows } = await pool.query(
        'SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1',
        [`%${query}%`]
      );
      matchingProducts = rows;
    }
    res.render('product_search', { products: matchingProducts, searchQuery: query || '' });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});


// user registration form
app.get('/register', async (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2)',
      [username, password]
    );
    res.status(201).send('User registered successfully.');
  } catch (err) {
    res.status(400).send('Error: ' + err.message);
  }
});

// user logging in form
app.get('/login', async (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username = $1 AND password = $2',
    [username, password]
  );
  if (rows.length > 0) {
    req.session.user = rows[0];
    res.redirect('/products');
  } else {
    res.status(401).send('Invalid username or password.');
  }
});

// listing cart items
app.get('/cart', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Content available only for logged in users.');
    }
    try {
        const { rows } = await pool.query(
            'SELECT products.*, carts.quantity FROM products JOIN carts ON products.id = carts.product_id WHERE carts.user_id = $1',
            [req.session.user.id]
        );
        res.render('cart', { products: rows });
    } catch (err) {
        res.status(500).send('Error' + err.message);
    }
});


// adding up an item to the cart
app.get('/cart/add', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Content available only for logged in users.');
    }
    res.render('add_to_cart');
});

app.post('/cart/add', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Content available only for logged in users.');
    }
    const { productId, quantity } = req.body;
    try {
      await pool.query(
          'INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [req.session.user.id, productId, quantity || 1]
      );
      res.redirect('/cart');
    } catch (err) {
        res.status(400).send('Error: ' + err.message);
    }
});

// removing an item from the cart

app.post('/cart/remove', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Content available only for logged in users.');
    }
    const { productId } = req.body;
    try {
        await pool.query(
            'DELETE FROM carts WHERE user_id = $1 AND product_id = $2',
            [req.session.user.id, productId]
        );
        res.redirect('/cart');
    } catch (err) {
        res.status(400).send('Error: ' + err.message);
    }
});

// listing all users in the database
app.get('/users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users');
        res.render('users', { users: rows });
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});


// adding a new product to the database
app.get('/products/add', async (req, res) => {
    res.render('add_product');
});

app.post('/products/add', async (req, res) => {
    const { name, description, price } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO products (name, description, price) VALUES ($1, $2, $3)',
            [name, description, price]
        );
        res.redirect('/products');
    } catch (err) {
        res.status(400).send('Error:' + err.message);
    }
});

// removing a product from the whole database
app.get('/products/remove', async (req, res) => {
    res.render('delete_product');
});

app.post('/products/remove', async (req, res) => {
    const { productId } = req.body;
    try {
        // first, remove the product from the carts
        await pool.query('DELETE FROM carts WHERE product_id = $1', [productId]);

        // then, remove the product from the products table
        await pool.query('DELETE FROM products WHERE id = $1', [productId]);
        res.redirect('/products');
    } catch (err) {
        res.status(400).send('Error: ' + err.message);
    }
});

// editing a product
app.get('/products/edit:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        res.render('edit_product', { product: rows[0] });
    } catch (err) {
        res.status(400).send('Error: ' + err.message);
    }
});

app.put('/products/edit', async (req, res) => {
    const { productId, name, description, price } = req.body;
    try {
        await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4',
            [name, description, price, productId]
        );
        res.redirect('/products');
    } catch (err) {
        res.status(400).send('Error: ' + err.message);
    }
});

// list submitted orders
app.get('/admin/orders', async (req, res) => {
  // if (!req.session.user) {
  //   return res.status(401).send('Musisz być zalogowany.');
  // }
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
    res.render('orders', { orders: rows });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// list open orders (still in carts but not submitted)
app.get('/admin/orders/open', async (req, res) => {
  // if (!req.session.user) {
  //   return res.status(401).send('Musisz być zalogowany.');
  // }
  try {
    const { rows } = await pool.query(
      `SELECT 
          c.id AS cart_id,
          c.user_id,
          u.username AS user_name,
          c.product_id,
          p.name AS product_name,
          p.description AS product_description,
          p.price AS product_price,
          c.quantity
      FROM carts c
      JOIN users u ON c.user_id = u.id
      JOIN products p ON c.product_id = p.id`
    );
    res.render('open_orders', { orders: rows });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// checkout the cart
app.post('/checkout', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Content available only for logged in users.');
  }
  try {
    // create new order
    const { rows } = await pool.query(
      'INSERT INTO orders (user_id) VALUES ($1) RETURNING id',
      [req.session.user.id]
    );
    const orderId = rows[0].id;

    // move cart items to order_items
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity)
       SELECT $1, product_id, quantity FROM carts WHERE user_id = $2`,
      [orderId, req.session.user.id]
    );

    // clear the cart
    await pool.query('DELETE FROM carts WHERE user_id = $1', [req.session.user.id]);

    res.redirect('/products');
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// run the server (with new, cleared session)
app.listen(port, () => {
  console.log(`Shop Web Service is running at http://localhost:${port}`);
});
