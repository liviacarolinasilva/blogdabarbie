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

app.use(express.static('public'));
app.use('/imagem', express.static('imagem'));


app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

app.get('/perfil', (req, res) => {
    res.render('perfil');
});

app.get('/categoria', (req, res) => {
    res.render('categoria');
});

app.get('/contato', (req, res) => {
    res.render('contato');
});

app.get('/denuncias', (req, res) => {
    res.render('denuncias');
});

app.get('/midias', async (req, res) => {
    try {
        const [midias] = await db.query(`
            SELECT 
                midias.*,
                publicacoes.nome AS nome_publicacao
            FROM midias
            INNER JOIN publicacoes
                ON midias.publicacao_id = publicacoes.id
            ORDER BY midias.id DESC
        `);

        res.render('midias', {
            midias: midias
        });

    } catch (error) {
        console.error('Erro ao carregar mídias:', error);
        res.status(500).send('Erro ao carregar mídias.');
    }
});


//login

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: 'Preencha e-mail e senha!'
        });
    }

    try {
        const [usuarios] = await db.query(
            'SELECT * FROM login WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos!'
            });
        }

        const usuario = usuarios[0];

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos!'
            });
        }

        res.json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);

        res.status(500).json({
            mensagem: 'Erro interno no servidor.'
        });
    }
});
//cadastro

app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            mensagem: 'Por favor, preencha todos os campos!'
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            mensagem: 'A senha deve ter pelo menos 6 caracteres.'
        });
    }

    try {
        const [usuariosExistentes] = await db.query(
            'SELECT id FROM login WHERE email = ?',
            [email]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(400).json({
                mensagem: 'E-mail já cadastrado!'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await db.query(
            `INSERT INTO login
            (nome, email, senha)
            VALUES (?, ?, ?)`,
            [nome, email, senhaHash]
        );

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            id: resultado.insertId
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);

        res.status(500).json({
            mensagem: 'Erro interno no servidor.'
        });
    }
});


//perfil
app.get('/perfil/:login_id', async (req, res) => {
    const { login_id } = req.params;

    try {
        const [perfil] = await db.query(`
            SELECT
                login.id,
                login.nome,
                login.email,
                perfil.biografia,
                perfil.foto_perfil,
                perfil.data_nascimento
            FROM login
            LEFT JOIN perfil
                ON login.id = perfil.login_id
            WHERE login.id = ?
        `, [login_id]);

        if (perfil.length === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        res.json(perfil[0]);

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);

        res.status(500).json({
            mensagem: 'Erro ao buscar perfil.'
        });
    }
});


app.post('/perfil', async (req, res) => {
    const {
        login_id,
        biografia,
        foto_perfil,
        data_nascimento
    } = req.body;

    try {
        const [perfilExistente] = await db.query(
            'SELECT id FROM perfil WHERE login_id = ?',
            [login_id]
        );

        if (perfilExistente.length > 0) {

            await db.query(`
                UPDATE perfil
                SET biografia = ?,
                    foto_perfil = ?,
                    data_nascimento = ?
                WHERE login_id = ?
            `, [
                biografia,
                foto_perfil,
                data_nascimento,
                login_id
            ]);

        } else {

            await db.query(`
                INSERT INTO perfil
                (login_id, biografia, foto_perfil, data_nascimento)
                VALUES (?, ?, ?, ?)
            `, [
                login_id,
                biografia,
                foto_perfil,
                data_nascimento
            ]);
        }

        res.json({
            mensagem: 'Perfil atualizado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);

        res.status(500).json({
            mensagem: 'Erro ao atualizar perfil.'
        });
    }
});


//publicações
app.get('/publicacoes', async (req, res) => {
    try {
        const [publicacoes] = await db.query(`
            SELECT
                publicacoes.*,
                login.nome AS autor
            FROM publicacoes
            INNER JOIN login
                ON publicacoes.login_id = login.id
            ORDER BY publicacoes.data_publicacao DESC
        `);

        res.render('publicacoes', {
            publicacoes: publicacoes
        });

    } catch (error) {
        console.error('Erro ao buscar publicações:', error);

        res.status(500).send(
            'Erro ao carregar publicações.'
        );
    }
});


// Página de publicações
app.get('/publicacao', async (req, res) => {
    try {
        const [publicacoes] = await db.query(`
            SELECT
                publicacoes.*,
                login.nome AS autor
            FROM publicacoes
            INNER JOIN login
                ON publicacoes.login_id = login.id
            ORDER BY publicacoes.data_publicacao DESC
        `);

        res.render('publicacoes', {
            publicacoes: publicacoes
        });

    } catch (error) {
        console.error('Erro ao carregar publicações:', error);

        res.status(500).send(
            'Erro ao carregar publicações.'
        );
    }
});


// Criar publicação
app.post('/publicacao', async (req, res) => {
    const {
        login_id,
        nome,
        imagem,
        publicacao_texto
    } = req.body;

    if (!login_id || !nome || !publicacao_texto) {
        return res.status(400).json({
            mensagem: 'Preencha os campos obrigatórios.'
        });
    }

    try {
        await db.query(`
            INSERT INTO publicacoes
            (login_id, nome, data_publicacao, imagem, publicacao_texto)
            VALUES (?, ?, NOW(), ?, ?)
        `, [
            login_id,
            nome,
            imagem || null,
            publicacao_texto
        ]);

        res.status(201).json({
            mensagem: 'Publicação criada com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao criar publicação:', error);

        res.status(500).json({
            mensagem: 'Erro ao criar publicação.'
        });
    }
});


// Excluir publicação
app.delete('/publicacao/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query(
            'DELETE FROM publicacoes WHERE id = ?',
            [id]
        );

        res.json({
            mensagem: 'Publicação excluída com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao excluir publicação:', error);

        res.status(500).json({
            mensagem: 'Erro ao excluir publicação.'
        });
    }
});

//categoria

app.get('/categoria/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [categoria] = await db.query(
            'SELECT * FROM categorias WHERE id = ?',
            [id]
        );

        if (categoria.length === 0) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            });
        }

        const [publicacoes] = await db.query(`
            SELECT
                publicacoes.*,
                login.nome AS autor
            FROM publicacoes
            INNER JOIN login
                ON publicacoes.login_id = login.id
            INNER JOIN publicacoes_categorias
                ON publicacoes.id = publicacoes_categorias.publicacao_id
            WHERE publicacoes_categorias.categoria_id = ?
            ORDER BY publicacoes.data_publicacao DESC
        `, [id]);

        res.json({
            categoria: categoria[0],
            publicacoes: publicacoes
        });

    } catch (error) {
        console.error('Erro ao buscar categoria:', error);

        res.status(500).json({
            mensagem: 'Erro ao carregar categoria.'
        });
    }
});
//comentarios

app.post('/comentarios', async (req, res) => {
    const {
        login_id,
        publicacao_id,
        nome,
        comentario_texto
    } = req.body;

    if (!login_id || !publicacao_id || !comentario_texto) {
        return res.status(400).json({
            mensagem: 'Preencha os campos obrigatórios.'
        });
    }

    try {
        await db.query(`
            INSERT INTO comentarios
            (login_id, publicacao_id, nome, data_comentario, comentario_texto)
            VALUES (?, ?, ?, NOW(), ?)
        `, [
            login_id,
            publicacao_id,
            nome || null,
            comentario_texto
        ]);

        res.status(201).json({
            mensagem: 'Comentário adicionado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);

        res.status(500).json({
            mensagem: 'Erro ao adicionar comentário.'
        });
    }
});


app.delete('/comentarios/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query(
            'DELETE FROM comentarios WHERE id = ?',
            [id]
        );

        res.json({
            mensagem: 'Comentário excluído com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao excluir comentário:', error);

        res.status(500).json({
            mensagem: 'Erro ao excluir comentário.'
        });
    }
});
//curtidas
app.post('/curtidas', async (req, res) => {
    const {
        login_id,
        publicacao_id
    } = req.body;

    try {
        await db.query(`
            INSERT INTO curtidas
            (login_id, publicacao_id, data_curtida)
            VALUES (?, ?, NOW())
        `, [
            login_id,
            publicacao_id
        ]);

        res.json({
            mensagem: 'Publicação curtida!'
        });

    } catch (error) {
        console.error('Erro ao curtir:', error);

        res.status(400).json({
            mensagem: 'Você já curtiu esta publicação.'
        });
    }
});


app.delete('/curtidas/:publicacao_id/:login_id', async (req, res) => {
    const {
        publicacao_id,
        login_id
    } = req.params;

    try {
        await db.query(`
            DELETE FROM curtidas
            WHERE publicacao_id = ?
            AND login_id = ?
        `, [
            publicacao_id,
            login_id
        ]);

        res.json({
            mensagem: 'Curtida removida!'
        });

    } catch (error) {
        console.error('Erro ao remover curtida:', error);

        res.status(500).json({
            mensagem: 'Erro ao remover curtida.'
        });
    }
});


//denuncias
app.post('/denuncias', async (req, res) => {
    const {
        login_id,
        publicacao_id,
        motivo
    } = req.body;

    if (!login_id || !publicacao_id || !motivo) {
        return res.status(400).json({
            mensagem: 'Preencha todos os campos da denúncia.'
        });
    }

    try {
        await db.query(`
            INSERT INTO denuncias
            (login_id, publicacao_id, motivo, status, data_denuncia)
            VALUES (?, ?, ?, 'pendente', NOW())
        `, [
            login_id,
            publicacao_id,
            motivo
        ]);

        res.status(201).json({
            mensagem: 'Denúncia enviada com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao enviar denúncia:', error);

        res.status(500).json({
            mensagem: 'Erro ao enviar denúncia.'
        });
    }
});

//tags
app.get('/tags', async (req, res) => {
    try {
        const [tags] = await db.query(
            'SELECT * FROM tags ORDER BY nome'
        );

        res.json(tags);

    } catch (error) {
        console.error('Erro ao buscar tags:', error);

        res.status(500).json({
            mensagem: 'Erro ao buscar tags.'
        });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});