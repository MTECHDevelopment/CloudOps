const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const VOTACOES_TABLE = 'cloudops-votacoes';
const PESQUISAS_TABLE = process.env.PESQUISAS_TABLE;

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        if (event.httpMethod === 'POST') {
            return await registrarVoto(JSON.parse(event.body), headers);
        } else if (event.httpMethod === 'GET') {
            return await getVotacao(event.pathParameters.pesquisaId, headers);
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};

async function registrarVoto(data, headers) {
    const { pesquisaId, votanteId, votosEm } = data;
    
    // Buscar ou criar votação
    let votacao = await getOrCreateVotacao(pesquisaId);
    
    // Verificar se o usuário já votou
    if (votacao.votantes.includes(votanteId)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Você já votou nesta pesquisa' })
        };
    }

    // Registrar votos
    votosEm.forEach(candidatoId => {
        if (!votacao.votos[candidatoId]) {
            votacao.votos[candidatoId] = 0;
        }
        votacao.votos[candidatoId]++;
    });
    
    votacao.votantes.push(votanteId);
    votacao.updatedAt = new Date().toISOString();

    // Verificar se a votação foi concluída
    const pesquisa = await getPesquisa(pesquisaId);
    const totalVotantes = votacao.votantes.length;
    const minVotos = Math.ceil(pesquisa.maxParticipantes / 2) - 1;
    
    if (totalVotantes >= pesquisa.candidatos?.length) {
        // Votação concluída - formar grupo
        const grupoFormado = formarGrupo(votacao.votos, pesquisa.maxParticipantes);
        votacao.status = 'concluida';
        votacao.grupoFormado = grupoFormado;
        
        // Atualizar pesquisa
        await atualizarPesquisa(pesquisaId, grupoFormado);
    }

    // Salvar votação
    await dynamoDB.send(new PutCommand({
        TableName: VOTACOES_TABLE,
        Item: votacao
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Voto registrado com sucesso!',
            votacao: {
                totalVotantes: votacao.votantes.length,
                status: votacao.status,
                grupoFormado: votacao.grupoFormado
            }
        })
    };
}

async function getVotacao(pesquisaId, headers) {
    const votacao = await getOrCreateVotacao(pesquisaId);
    const pesquisa = await getPesquisa(pesquisaId);

    // Ordenar candidatos por votos
    const ranking = Object.entries(votacao.votos)
        .map(([candidatoId, votos]) => ({ candidatoId, votos }))
        .sort((a, b) => b.votos - a.votos);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            status: votacao.status,
            totalVotantes: votacao.votantes.length,
            totalCandidatos: pesquisa.candidatos?.length || 0,
            maxParticipantes: pesquisa.maxParticipantes,
            ranking,
            grupoFormado: votacao.grupoFormado
        })
    };
}

async function getOrCreateVotacao(pesquisaId) {
    try {
        const result = await dynamoDB.send(new GetCommand({
            TableName: VOTACOES_TABLE,
            Key: { votacaoId: `votacao-${pesquisaId}` }
        }));

        if (result.Item) {
            return result.Item;
        }
    } catch (error) {
        console.log('Votação não encontrada, criando nova...');
    }

    // Criar nova votação
    const novaVotacao = {
        votacaoId: `votacao-${pesquisaId}`,
        pesquisaId,
        votos: {},
        votantes: [],
        status: 'aberta',
        grupoFormado: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
        TableName: VOTACOES_TABLE,
        Item: novaVotacao
    }));

    return novaVotacao;
}

async function getPesquisa(pesquisaId) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));
    return result.Item || {};
}

async function atualizarPesquisa(pesquisaId, grupoFormado) {
    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: 'SET grupoFormado = :grupo, #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':grupo': grupoFormado,
            ':status': 'grupo-formado',
            ':updatedAt': new Date().toISOString()
        }
    }));
}

function formarGrupo(votos, maxParticipantes) {
    // Ordenar por número de votos e pegar os mais votados
    return Object.entries(votos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxParticipantes)
        .map(([candidatoId]) => candidatoId);
}
