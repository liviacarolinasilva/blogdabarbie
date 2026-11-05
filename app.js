require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/imagem', express.static(path.join(__dirname, 'imagem')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-blog-barbie-local',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use((req, res, next) => {
    res.locals.rota = req.path;
    res.locals.usuario = req.session.usuario || null;
    next();
});

// VERIFICAR LOGIN

function verificarLogin(req, res, next) {
    if (req.session.usuario) {
        return next();
    }

    return res.redirect('/login');
}

// PÁGINA INICIAL

app.get('/', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/home');
    }

    res.render('index');
});

// LOGIN E CADASTRO

app.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/perfil');
    }

    res.render('login', { erro: null });
});

app.get('/cadastro', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/perfil');
    }

    res.render('cadastro', { erro: null });
});

// PÁGINAS PROTEGIDAS

app.get('/home', verificarLogin, (req, res) => {
    res.render('home');
});

app.get('/categoria', verificarLogin, (req, res) => {
    res.render('categoria');
});

app.get('/contato', verificarLogin, (req, res) => {
    res.render('contato');
});

app.get('/denuncias', verificarLogin, (req, res) => {
    res.render('denuncias');
});

app.get('/midias', verificarLogin, (req, res) => {
    res.render('midias');
});

// CADASTRO

app.post('/cadastro', async (req, res) => {
     console.log('ROTA DE CADASTRO FOI ACESSADA!');
    console.log('Formulário de cadastro recebido!');
    console.log('Dados recebidos:', {
        nome: req.body.nome,
        email: req.body.email,
        senha: req.body.senha ? 'Informada' : 'Não informada'
    });

    const nome = req.body.nome?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const senha = req.body.senha;

    if (!nome || !email || !senha) {
        return res.status(400).render('cadastro', {
            erro: 'Preencha todos os campos.'
        });
    }

    if (senha.length < 6) {
        return res.status(400).render('cadastro', {
            erro: 'A senha deve ter pelo menos 6 caracteres.'
        });
    }

    try {
        const [usuariosExistentes] = await db.query(
            'SELECT id FROM login WHERE email = ?',
            [email]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(409).render('cadastro', {
                erro: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await db.query(
            `INSERT INTO login (nome, email, senha)
             VALUES (?, ?, ?)`,
            [nome, email, senhaHash]
        );

        console.log('Usuário cadastrado com sucesso! ID:', resultado.insertId);

        return res.redirect('/login');

    } catch (error) {
        console.error('ERRO COMPLETO NO CADASTRO:');
        console.error(error);
        console.error(error.stack);

        return res.status(500).render('cadastro', {
            erro: 'Não foi possível realizar o cadastro. Verifique o terminal para identificar o problema.'
        });
    }
});

// LOGIN

app.post('/login', async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const senha = req.body.senha;

    if (!email || !senha) {
        return res.status(400).render('login', {
            erro: 'Preencha o e-mail e a senha.'
        });
    }

    try {
        const [usuarios] = await db.query(
            'SELECT * FROM login WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).render('login', {
                erro: 'E-mail ou senha incorretos.'
            });
        }

        const usuario = usuarios[0];

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return res.status(401).render('login', {
                erro: 'E-mail ou senha incorretos.'
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error('Erro ao criar sessão:', error);

                return res.status(500).send(
                    'Erro ao iniciar a sessão.'
                );
            }

            req.session.usuario = {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            };

            req.session.save((erroSalvar) => {
                if (erroSalvar) {
                    console.error('Erro ao salvar sessão:', erroSalvar);

                    return res.status(500).send(
                        'Erro ao iniciar a sessão.'
                    );
                }

                return res.redirect('/perfil');
            });
        });

    } catch (error) {
        console.error('Erro no login:', error);

        res.status(500).render('login', {
            erro: 'Erro interno ao realizar login.'
        });
    }
});

// LOGOUT

app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Erro ao encerrar sessão:', error);
            return res.status(500).send('Erro ao sair da conta.');
        }

        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// BUSCAR PERFIL

app.get('/perfil/:login_id', verificarLogin, async (req, res) => {
    const loginId = Number(req.params.login_id);

    if (loginId !== Number(req.session.usuario.id)) {
        return res.status(403).json({
            mensagem: 'Acesso não permitido.'
        });
    }

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
        `, [loginId]);

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

// ATUALIZAR PERFIL

app.post('/perfil', verificarLogin, async (req, res) => {
    const loginId = req.session.usuario.id;

    const {
        biografia,
        foto_perfil,
        data_nascimento
    } = req.body;

    try {
        const [perfilExistente] = await db.query(
            'SELECT id FROM perfil WHERE login_id = ?',
            [loginId]
        );

        if (perfilExistente.length > 0) {
            await db.query(`
                UPDATE perfil
                SET biografia = ?,
                    foto_perfil = ?,
                    data_nascimento = ?
                WHERE login_id = ?
            `, [
                biografia || null,
                foto_perfil || null,
                data_nascimento || null,
                loginId
            ]);

        } else {
            await db.query(`
                INSERT INTO perfil
                (login_id, biografia, foto_perfil, data_nascimento)
                VALUES (?, ?, ?, ?)
            `, [
                loginId,
                biografia || null,
                foto_perfil || null,
                data_nascimento || null
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

// BUSCAR CATEGORIA

app.get('/categoria/:id', verificarLogin, async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send('Categoria inválida.');
    }

    try {
        const [categorias] = await db.query(`
            SELECT
                categorias.*,
                COUNT(publicacoes_categorias.publicacao_id) AS total_publicacoes
            FROM categorias
            LEFT JOIN publicacoes_categorias
                ON categorias.id = publicacoes_categorias.categoria_id
            GROUP BY categorias.id
        `);

        const categoriaSelecionada = categorias.find(
            cat => cat.id === id
        );

        if (!categoriaSelecionada) {
            return res.status(404).send('Categoria não encontrada.');
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

        res.render('categoria', {
            categorias,
            categoriaSelecionada,
            publicacoes
        });

    } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        res.status(500).send('Erro ao carregar categoria.');
    }
});

// CURTIR MÍDIA
// CURTIR PUBLICAÇÕES

app.post('/publicacoes/:id/curtir', verificarLogin, async (req, res) => {
    const publicacaoId = Number(req.params.id);
    const loginId = req.session.usuario.id;

    if (!Number.isInteger(publicacaoId) || publicacaoId <= 0) {
        return res.status(400).json({
            mensagem: 'Publicação inválida.'
        });
    }

    try {
        const [publicacoes] = await db.query(
            'SELECT id FROM publicacoes WHERE id = ?',
            [publicacaoId]
        );

        if (publicacoes.length === 0) {
            return res.status(404).json({
                mensagem: 'Publicação não encontrada.'
            });
        }

        const [existente] = await db.query(
            `SELECT id FROM curtidas
             WHERE publicacao_id = ? AND login_id = ?`,
            [publicacaoId, loginId]
        );

        let curtida;

        if (existente.length > 0) {
            await db.query(
                'DELETE FROM curtidas WHERE id = ?',
                [existente[0].id]
            );

            curtida = false;
        } else {
            await db.query(
                `INSERT INTO curtidas
                 (login_id, publicacao_id, data_curtida)
                 VALUES (?, ?, NOW())`,
                [loginId, publicacaoId]
            );

            curtida = true;
        }

        const [total] = await db.query(
            'SELECT COUNT(*) AS total FROM curtidas WHERE publicacao_id = ?',
            [publicacaoId]
        );

        res.json({
            curtida,
            total: total[0].total
        });

    } catch (error) {
        console.error('Erro ao curtir publicação:', error);

        res.status(500).json({
            mensagem: 'Erro ao registrar curtida.'
        });
    }
});
// ENVIAR DENÚNCIA

app.post('/denuncias', verificarLogin, async (req, res) => {
    const loginId = req.session.usuario.id;
    const { publicacao_id, motivo } = req.body;

    if (!publicacao_id || !motivo) {
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
            loginId,
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

// BUSCAR TAGS

app.get('/tags', verificarLogin, async (req, res) => {
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

// INICIAR SERVIDOR

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});