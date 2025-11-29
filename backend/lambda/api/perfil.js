/**
 * CloudOps - Perfil API Handler
 * CRUD completo de perfis de usuários
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE;

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const method = event.httpMethod;
    const pathParams = event.pathParameters || {};

    try {
        switch (method) {
            case 'POST':
                return await createPerfil(JSON.parse(event.body));
            
            case 'GET':
                if (pathParams.userId) {
                    return await getPerfil(pathParams.userId);
                }
                return await listPerfis(event.queryStringParameters);
            
            case 'PUT':
                return await updatePerfil(pathParams.userId, JSON.parse(event.body));
            
            case 'DELETE':
                return await deletePerfil(pathParams.userId);
            
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Método não permitido' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Erro interno' })
        };
    }
};

async function createPerfil(data) {
    const userId = data.userId || uuidv4();
    const timestamp = new Date().toISOString();

    const perfil = {
        userId,
        email: data.email,
        nome: data.nome,
        tipoUsuario: data.tipoUsuario, // 'aluno', 'professor', 'pesquisador'
        telefone: data.telefone,
        localizacao: data.localizacao,
        nacionalidade: data.nacionalidade || 'brasileiro',
        
        // Formação
        escolaridade: data.escolaridade,
        curso: data.curso,
        instituicao: data.instituicao,
        anoFormacao: data.anoFormacao,
        formacoesAdicionais: data.formacoesAdicionais || [],
        
        // Experiência
        anosExperiencia: data.anosExperiencia || 0,
        numPublicacoes: data.numPublicacoes || 0,
        linkLattes: data.linkLattes,
        linkOrcid: data.linkOrcid,
        publicacoes: data.publicacoes || [],
        experiencias: data.experiencias || [],
        
        // Interesses e Habilidades
        areasInteresse: data.areasInteresse || [],
        habilidades: data.habilidades || [],
        idiomas: data.idiomas || [],
        
        // Disponibilidade
        disponibilidade: data.disponibilidade || 'parcial',
        modalidade: data.modalidade || 'hibrido',
        
        // Metadata
        status: 'ativo',
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await dynamoDB.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: perfil
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            message: 'Perfil criado com sucesso!',
            userId,
            perfil
        })
    };
}

async function getPerfil(userId) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Perfil não encontrado' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}

async function listPerfis(queryParams) {
    const params = { TableName: USERS_TABLE };

    // Filtrar por tipo de usuário
    if (queryParams?.tipoUsuario) {
        params.IndexName = 'tipo-index';
        params.KeyConditionExpression = 'tipoUsuario = :tipo';
        params.ExpressionAttributeValues = { ':tipo': queryParams.tipoUsuario };

        const result = await dynamoDB.send(new QueryCommand(params));
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                count: result.Items.length,
                perfis: result.Items
            })
        };
    }

    // Listar todos (com limite)
    params.Limit = parseInt(queryParams?.limit) || 50;
    const result = await dynamoDB.send(new ScanCommand(params));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            count: result.Items.length,
            perfis: result.Items
        })
    };
}

async function updatePerfil(userId, data) {
    // Construir expressão de atualização dinamicamente
    const updateExpressions = [];
    const expressionNames = {};
    const expressionValues = {};

    const allowedFields = [
        'nome', 'telefone', 'localizacao', 'escolaridade', 'curso',
        'instituicao', 'anosExperiencia', 'numPublicacoes', 'linkLattes',
        'linkOrcid', 'areasInteresse', 'habilidades', 'idiomas',
        'disponibilidade', 'modalidade', 'publicacoes', 'experiencias'
    ];

    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionNames[`#${field}`] = field;
            expressionValues[`:${field}`] = data[field];
        }
    });

    // Sempre atualizar updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionNames['#updatedAt'] = 'updatedAt';
    expressionValues[':updatedAt'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW'
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Perfil atualizado com sucesso!' })
    };
}

async function deletePerfil(userId) {
    // Soft delete - apenas marca como inativo
    await dynamoDB.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
            ':status': 'inativo',
            ':updatedAt': new Date().toISOString()
        }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Perfil removido com sucesso!' })
    };
}
