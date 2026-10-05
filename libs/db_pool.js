const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host : 'localhost',
    user : 'root',
    password : '1234',
    port : 3307,
    database: 'rubber_systems_flutter',   
    connectionLimit : 5 
});

module.exports = pool;