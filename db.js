require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
    rejectUnauthorized: true
  }
});

pool.query('SELECT 1')
  .then(() => console.log('Banco de dados conectado com sucesso!'))
  .catch(err => console.log('Erro ao conectar:', err.message));

module.exports = pool;

