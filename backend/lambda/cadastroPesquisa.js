const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PESQUISAS_TABLE;

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        if (event.httpMethod === 'POST') {
            return await createPesquisa(JSON.parse(event.body), headers);
        } else if (event.httpMethod === 'GET') {
            return await listPesquisas(event.queryStringParameters, headers);
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

async function createPesquisa(data, headers) {
    const pesquisaId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const pesquisa = {
        pesquisaId,
        professorId: data.professorId,
        titulo: data.titulo,
        descricao: data.descricao,
        dataInicio: data.dataInicio,
        duracao: data.duracao,
        areas: data.areas || [],
        escolaridadeMinima: data.escolaridadeMinima,
        historicoPublicacao: data.historicoPublicacao || 0,
        idiomas: data.idiomas || [],
        habilidadesTecnicas: data.habilidadesTecnicas || [],
        instituicao: data.instituicao,
        minParticipantes: data.minParticipantes || 2,
        maxParticipantes: data.maxParticipantes || 5,
        imprescindivel: data.imprescindivel || [],
        filtrosAdicionais: data.filtrosAdicionais || {},
        status: 'ativa',
        candidatos: [],
        grupoFormado: false,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await dynamoDB.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: pesquisa
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
            message: 'Pesquisa cadastrada com sucesso!',
            pesquisaId,
            pesquisa 
        })
    };
}

async function listPesquisas(queryParams, headers) {
    const params = {
        TableName: TABLE_NAME
    };

    // Filtrar por status se especificado
    if (queryParams?.status) {
        params.FilterExpression = '#status = :status';
        params.ExpressionAttributeNames = { '#status': 'status' };
        params.ExpressionAttributeValues = { ':status': queryParams.status };
    }

    const result = await dynamoDB.send(new ScanCommand(params));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            count: result.Items.length,
            pesquisas: result.Items
        })
    };
}
