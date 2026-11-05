CREATE DATABASE blogbarbie;
USE blogbarbie;

CREATE TABLE login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE perfil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id INT NOT NULL UNIQUE,
    biografia TEXT,
    foto_perfil VARCHAR(255),
    data_nascimento DATE,
    FOREIGN KEY (login_id) REFERENCES login(id)
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT
);

CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE midias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    publicacao_id INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    legenda TEXT,
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id)
);

CREATE TABLE curtidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    data_curtida DATETIME NOT NULL,
    FOREIGN KEY (login_id) REFERENCES login(id),
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id),
    UNIQUE (login_id, publicacao_id)
);

CREATE TABLE denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    data_denuncia DATETIME NOT NULL,
    FOREIGN KEY (login_id) REFERENCES login(id),
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id)
);
