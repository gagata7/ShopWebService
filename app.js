// Importujemy wymagane moduły
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
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
    res.sendFile(path.join(__dirname, 'views/index.html'));
});


// Przeglądanie produktów
app.get('/products', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products');
        res.render('products', { products: rows });
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

// Wylistowanie wszystkich użytkowników
app.get('/users', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM users');
    res.json(rows);
});


// Dodawanie produktu
app.post('/products/add', async (req, res) => {
    const { name, description, price } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO products (name, description, price) VALUES ($1, $2, $3)',
            [name, description, price]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(400).send('Błąd dodawania produktu: ' + err.message);
    }
});

// Usuwanie produktu
app.delete('/products/delete:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(400).send('Błąd usuwania produktu: ' + err.message);
    }
});

// Edycja produktu
app.put('/products/edit:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price } = req.body;
    try {
        await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3 WHERE id = $4',
            [name, description, price, id]
        );
        res.send('Produkt zaktualizowany.');
    } catch (err) {
        res.status(400).send('Błąd edycji produktu: ' + err.message);
    }
});

// Sprawdź złożone zamówienia
app.get('/orders', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Musisz być zalogowany.');
  }
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1',
    [req.session.user.id]
  );
  res.json(rows);
});

// Sprawdź otwarte zamówienia
app.get('/orders/open', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Musisz być zalogowany.');
  }
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 AND closed_at IS NULL',
    [req.session.user.id]
  );
  res.json(rows);
});

// Uruchamianie serwera
app.listen(port, () => {
  console.log(`Aplikacja działa na http://localhost:${port}`);
});
