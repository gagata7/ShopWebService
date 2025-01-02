**Shop Webservice Project**


**About shop**
Run psql console: *psql -U admin -h localhost -d shop_webservice*
password: *localhost*

**TO DO:**
- initialize server [DONE]
- install and configure database [DONE]
- create needed tables (Users, Products, Carts etc.) [DONE]

- create models of:
    - anonymous user
    - user
    - admin
    - product
    - basket


- create endpoints:
    - dodawanie, modyfikacja, usuwanie towarów (dla admina) [DONE]
    - przeglądanie listy użytkowników (dla admina) [DONE]
    - przeglądanie listy złożonych/otwartych zamówień (dla admina) [DONE]


- create views for all endpoints
- change availability of endpoints for admin, anonymous/logged user respectively
- translate polish to english (comments and code fragments)
- add any hardcoded data to gitignore and hide it in files
- add to readmd and start page some info about shop and its endpoints
- split code from app.js to more short files