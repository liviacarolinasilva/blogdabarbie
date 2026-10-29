require('dotenv').config();

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const conexao = mysql.createConnection({
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

conexao.connect(function (erro) {
  if (erro) {
    console.log('Erro ao conectar:', erro.message);
  } else {
    console.log('Banco de dados conectado com sucesso!');
  }
});

module.exports = conexao;