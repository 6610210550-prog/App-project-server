const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host : 'localhost',
    user : 'root',
    password : '1234',
    port : 3307,
    database: 'my_fitness',   
    connectionLimit : 5 
});

module.exports = pool;