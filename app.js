// Importujemy wymagane moduły
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

// Konfiguracja aplikacji Express
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'sekret',
  resave: false,
  saveUninitialized: true,
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
    res.send('Witaj w sklepie internetowym!');
});


// Przeglądanie produktów
app.get('/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products');
  res.json(rows);
});

// Wyszukiwanie produktów
app.get('/products/search', async (req, res) => {
  const { query } = req.query;
  const { rows } = await pool.query(
    'SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1',
    [`%${query}%`]
  );
  res.json(rows);
});

// Rejestracja użytkownika
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

// Dodawanie produktu do koszyka
app.post('/cart', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Musisz być zalogowany.');
  }
  const { productId, quantity } = req.body;
  await pool.query(
    'INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)',
    [req.session.user.id, productId, quantity || 1]
  );
  res.send('Produkt dodany do koszyka.');
});

// Uruchamianie serwera
app.listen(port, () => {
  console.log(`Aplikacja działa na http://localhost:${port}`);
});
