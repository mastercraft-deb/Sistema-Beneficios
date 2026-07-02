const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ============================================
// FUNÇÃO PARA CARREGAR DADOS DO ARQUIVO
// ============================================
async function carregarDatabase() {
    try {
        const conteudo = await fs.readFile(DATABASE_FILE, 'utf-8');
        return JSON.parse(conteudo);
    } catch (error) {
        // Se não existir, inicia vazia
        if (error.code === 'ENOENT') {
            await fs.writeFile(DATABASE_FILE, JSON.stringify({ usuarios: [] }, null, 2));
            return { usuarios: [] };
        }
        throw error;
    }
}

// ============================================
// FUNÇÃO PARA SALVAR DADOS NO ARQUIVO
// ============================================
async function salvarDatabase(dados) {
    await fs.writeFile(
        DATABASE_FILE, 
        JSON.stringify(dados, null, 2),
        'utf-8'
    );
    console.log(`✓ Database atualizado em ${DATABASE_FILE}`);
}


// ============================================
// ROTAS DA API BACKEND
// ============================================

// 1. CADASTRAR UM NOVO USUÁRIO
app.post('/api/usuarios', async (req, res) => {
    try {
        const { id, cpf, nome, cep } = req.body;

        // Validações básicas
        if (!id || !cpf || !nome || !cep) {
            return res.status(400).json({
                success: false,
                mensagem: 'Todos os campos são obrigatórios: id, cpf, nome, cep'
            });
        }

        // Buscar endereço da API externa
        const endereco = await buscarEnderecoPorCep(cep);

        // Carregar database existente
        const database = await carregarDatabase();

        // Verificar se CPF já existe
        const usuarioExistente = database.usuarios.find(u => u.cpf === cpf);
        if (usuarioExistente) {
            return res.status(409).json({
                success: false,
                mensagem: 'CPF já cadastrado!'
            });
        }

        // Criar objeto do usuário completo
        const novoUsuario = {
            id,
            cpf,
            nome,
            endereco,
            data_cadastro: new Date().toISOString()
        };

        // Adicionar à lista
        database.usuarios.push(novoUsuario);

        // Salvar no arquivo JSON
        await salvarDatabase(database);

        res.status(201).json({
            success: true,
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: novoUsuario
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            mensagem: error.message
        });
    }
});

// 2. LISTAR TODOS OS USUÁRIOS
app.get('/api/usuarios', async (req, res) => {
    try {
        const database = await carregarDatabase();
        res.json({
            success: true,
            total: database.usuarios.length,
            usuarios: database.usuarios
        });
    } catch (error) {
        res.status(500).json({ success: false, mensagem: error.message });
    }
});

// 3. BUSCAR USUÁRIO POR ID
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const database = await carregarDatabase();
        const usuario = database.usuarios.find(u => u.id === parseInt(req.params.id));

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        res.json({ success: true, usuario });
    } catch (error) {
        res.status(500).json({ success: false, mensagem: error.message });
    }
});

// 4. BUSCAR USUÁRIO POR CPF
app.get('/api/busca-cpf/:cpf', async (req, res) => {
    try {
        const database = await carregarDatabase();
        const usuario = database.usuarios.find(u => u.cpf === req.params.cpf);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                mensagem: 'CPF não encontrado'
            });
        }

        res.json({ success: true, usuario });
    } catch (error) {
        res.status(500).json({ success: false, mensagem: error.message });
    }
});

// 5. DELETAR USUÁRIO (OPCIONAL)
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const database = await carregarDatabase();
        const indiceRemover = database.usuarios.findIndex(u => u.id === parseInt(req.params.id));

        if (indiceRemover === -1) {
            return res.status(404).json({
                success: false,
                mensagem: 'Usuário não encontrado'
            });
        }

        database.usuarios.splice(indiceRemover, 1);
        await salvarDatabase(database);

        res.json({ success: true, mensagem: 'Usuário removido com sucesso!' });
    } catch (error) {
        res.status(500).json({ success: false, mensagem: error.message });
    }
});

// 6. CONSULTAR O CEP
async function buscarEnderecoPorCep(cep) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
        throw new Error('Erro ao consultar o ViaCEP');
    }

    const dados = await response.json();

    if (dados.erro) {
        throw new Error('CEP não encontrado');
    }

    return {
        cep: dados.cep,
        logradouro: dados.logradouro,
        bairro: dados.bairro,
        cidade: dados.localidade,
        estado: dados.uf
    };
}

// ============================================
// INICIAR O SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log('\nEndpoints disponíveis:');
    console.log('  POST /api/usuarios          → Cadastrar usuário');
    console.log('  GET  /api/usuarios          → Listar todos');
    console.log('  GET  /api/usuarios/:id      → Busca por ID');
    console.log('  GET  /api/busca-cpf/:cpf    → Busca por CPF');
    console.log('  DELETE /api/usuarios/:id    → Deletar usuário');
    console.log('  GET  /                      → Página HTML principal');
});

