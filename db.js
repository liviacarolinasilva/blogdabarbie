const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'aluno',
  password: 'ifsp', 
  database: 'blogbarbie',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Pool de conexões MySQL configurado com sucesso!');

module.exports = db;
