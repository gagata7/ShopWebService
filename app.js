// Importujemy wymagane moduły
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const { Pool } = require('pg');

// Konfiguracja aplikacji Express
const app = express();
const port = 3000;

// Ustawianie EJS jako silnika widoków
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'sekret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 6000000 // Użytkownik jest ZALOGOWANY przez 60 sekund
  }
}));

// Konfiguracja bazy danych PostgreSQL
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'shop_webservice',
  password: 'haslo',
  port: 5432,
});

// Inicjalizacja tabel w bazie danych
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

initializeDatabase().then(() => console.log('Baza danych zainicjalizowana.'));

// Routing

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});


// Przeglądanie produktów
app.get('/products', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products');
        const user = req.session.user;
        res.render('products', { products: rows, user: user });
    } catch (err) {
        res.status(500).send('Błąd pobierania produktów: ' + err.message);
    }
});

// Wyszukiwanie produktów
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
    res.status(500).send('Błąd wyszukiwania produktów: ' + err.message);
  }
});


// Rejestracja użytkownika
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
    res.status(201).send('Użytkownik zarejestrowany.');
  } catch (err) {
    res.status(400).send('Błąd rejestracji: ' + err.message);
  }
});

// Logowanie użytkownika
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
    res.send('Zalogowano pomyślnie.');
  } else {
    res.status(401).send('Błędny login lub hasło.');
  }
});

// Wyświetlanie koszyka
app.get('/cart', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Musisz być zalogowany.');
    }
    try {
        const { rows } = await pool.query(
            'SELECT products.*, carts.quantity FROM products JOIN carts ON products.id = carts.product_id WHERE carts.user_id = $1',
            [req.session.user.id]
        );
        res.render('cart', { products: rows });
    } catch (err) {
        res.status(500).send('Błąd pobierania koszyka: ' + err.message);
    }
});


// Dodawanie produktu do koszyka
app.get('/cart/add', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Musisz być zalogowany.');
    }
    res.render('add_to_cart');
});

app.post('/cart/add', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Musisz być zalogowany.');
    }
    const { productId, quantity } = req.body;
    try {
        await pool.query(
            'INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)',
            [req.session.user.id, productId, quantity || 1]
        );
    res.send('Produkt dodany do koszyka.');
    } catch (err) {
        res.status(400).send('Błąd dodawania produktu do koszyka: ' + err.message);
    }
});

// Usunięcie produktów z koszyka
app.get('/cart/remove', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Musisz być zalogowany.');
    }
    res.render('remove_from_cart');
});

app.post('/cart/remove', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Musisz być zalogowany.');
    }
    console.log(req.body);
    const { productId } = req.body;
    try {
        await pool.query(
            'DELETE FROM carts WHERE user_id = $1 AND product_id = $2',
            [req.session.user.id, productId]
        );
        res.send('Produkt usunięty z koszyka.');
    } catch (err) {
        res.status(400).send('Błąd usuwania produktu z koszyka: ' + err.message);
    }
});

// Wylistowanie wszystkich użytkowników
app.get('/users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users');
        res.render('users', { users: rows });
    } catch (err) {
        res.status(500).send('Błąd pobierania użytkowników: ' + err.message);
    }
});


// Dodawanie produktu
app.get('/products/add', async (req, res) => {
    res.render('add_product');
});

app.post('/products/add', async (req, res) => {
    console.log(req.body);
    const { name, description, price } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO products (name, description, price) VALUES ($1, $2, $3)',
            [name, description, price]
        );
        res.redirect('/products');
    } catch (err) {
        res.status(400).send('Błąd dodawania produktu: ' + err.message);
    }
});

// Usuwanie produktu
app.get('/products/remove', async (req, res) => {
    res.render('delete_product');
});

app.post('/products/remove', async (req, res) => {
    const { productId } = req.body;
    try {
        // Najpierw usuń powiązane rekordy z tabeli carts
        await pool.query('DELETE FROM carts WHERE product_id = $1', [productId]);

        // Teraz usuń produkt z tabeli products
        await pool.query('DELETE FROM products WHERE id = $1', [productId]);
        res.redirect('/products');
    } catch (err) {
        res.status(400).send('Błąd usuwania produktu: ' + err.message);
    }
});

// Edycja produktu
app.get('/products/edit:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        res.render('edit_product', { product: rows[0] });
    } catch (err) {
        res.status(400).send('Błąd pobierania produktu: ' + err.message);
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
        res.status(400).send('Błąd edycji produktu: ' + err.message);
    }
});

// Sprawdź złożone zamówienia
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
    res.status(500).send('Błąd pobierania zamówień: ' + err.message);
  }
});

// Sprawdź otwarte zamówienia
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
    res.status(500).send('Błąd pobierania otwartych zamówień: ' + err.message);
  }
});

// Uruchamianie serwera
app.listen(port, () => {
  console.log(`Aplikacja działa na http://localhost:${port}`);
});
