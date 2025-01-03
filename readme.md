# Shop Webservice Project

### Run psql console:

- run`psql -U admin -h localhost -d shop_webservice`
  > Where `admin` is username of some user with privileges

<br>
<br>

## Table structure and content:

Main database is written with PostgreSQL and is named `shop_webservice`.\
Table definitions and initialization of database is in `config/db_setup.js` file.\
It is storing tables such as:

- `users` with fields:
  - id
  - username
  - password
  - is_admin - `true` if user is privileged, or `false` if it's not
- `products` with fiels:
  - id
  - name - has to be unique
  - description - also has to be unique
  - price
- `carts`with fields:
  - id
  - user_id - id of user, whose this cart is
  - product_id - id of product, that user have in its cart
  - quantity
- `orders`with fields:
  - id
  - user_id - id of user, who placed an order
  - created_at - date of putting first product to the empty cart
  - closed_at - date of placing the order with nonempty cart
- `order_items`with fields:
  - id
  - order_id
  - product_id - id of product that has been ordered
  - quantity

<br>
<br>

## Project structure

Project is divided into smaller parts, each of them correspond to its functionality.\
For example, functions operating strictly on table `products` are in `product.js`.\
Some of which, are available only for _privileged_ users.

Functions available for privileged users, are in `admin.js`

Functions interracting with `users` table, are in `user.js`

<br>
<br>

## All endpoints and what you can do with it:

- **`admin.js`**:

  - `/admin/users` lists all users registered in database (PRIVILEGED)
  - `/admin/placed` lists all already placed orders (PRIVILEGED)
  - `/admin/open` lists all users cart's content, which is not yet placed (PRIVILEGED)

- **`cart.js`**:

  - `/` lists user's cart content (LOGGED)

- **`index.js`**:

  - `/` prints the start page of the webshop

- **`product.js`**;

  - `/` lists all available products
  - `/product/search` searches for a certain phrase in name or description of product
  - `/product/add` adds new product to the offer (PRIVILEGED)
  - `/product/remove` removes a product of a certain `id` from the offer (PRIVILEGED)
  - `/product/edit/:id` enables editing name, description or price of product with`id`(PRIVILEGED)

- **`user`**;

  - `/users/register/` prints basic registration form (with username and password)
  - `/users/login/` prints logging form
