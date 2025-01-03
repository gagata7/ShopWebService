**Shop Webservice Project**

**About shop**
Run psql console: _psql -U admin -h localhost -d shop_webservice_
password: _localhost_

**TO DO:**

- initialize server [DONE]
- install and configure database [DONE]
- create needed tables (Users, Products, Carts etc.) [DONE]

- create endpoints:

  - dodawanie, modyfikacja, usuwanie towarów (dla admina) [DONE]
  - przeglądanie listy użytkowników (dla admina) [DONE]
  - przeglądanie listy złożonych/otwartych zamówień (dla admina) [DONE]

- add endpoint /chechout for paying and completing the cart [DONE]
- create views for all endpoints [DONE]

- change availability of endpoints for admin, anonymous/logged user respectively [DONE]

- translate polish to english (comments and code fragments) [DONE]

- add password encryptions [DONE]

- jak zrobić cenę po przecinku z dokładnością do 2 miejsc [DONE]

- split code from app.js to more short files

- add to readmd and start page some info about shop and its endpoints

- add some error handlers and pretty informing comment for user

- add any hardcoded data to gitignore and hide it in files

- dodaj pakiety potrzebne do instalacji do readme

- sformatuj ładnie kod

- jak zrobic zeby w nowym oknie sie nowa, niezalezna sesja odpalała ze sklepem
