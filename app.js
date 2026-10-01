const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');


app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index'); 
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});

app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/categoria', (req, res) =>{
    res.render('categoria');
});
app.get('/contato', (req, res) =>{
    res.render('contato');
});
app.get('/denuncias',(req, res)=>{
    res.render('denuncias');
});
app.get('/midias', (req, res)=>{
    res.render('midias');
});
app.get('/publicacao', (req, res)=>{
    res.render('publicacao');
});
app.get('/seguidores', (req, res)=>{
    res.render('seguidores');
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  
  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Preencha e-mail e senha!' });
  }

  try {
    
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    
    if (usuarios.length === 0) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
    }

    const usuario = usuarios[0];

    
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos!' });
    }

    
    return res.json({
      mensagem: 'Login realizado com sucesso!',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

/*app.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  // 1. Validação simples de entrada
  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Por favor, preencha todos os campos!' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 6 caracteres.' });
  } else {
        try {
        // 2. Verificar se o e-mail já está cadastrado
        const [usuariosExistentes] = await db.query(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
        );

        if (usuariosExistentes.length > 0) {
        return res.status(400).json({ mensagem: 'E-mail já cadastrado!' });
        }

        // 3. Criptografar a senha com Bcrypt (Salt de 10 rodadas)
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);

        // 4. Inserir o novo usuário no Banco de Dados
        await db.query(
        'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
        [nome, email, senhaHash]
        );

        return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        return res.status(500).json({ mensagem: 'Erro interno no servidor.' });
    }
}
});

*/
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});