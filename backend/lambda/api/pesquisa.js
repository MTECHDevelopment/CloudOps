/**
 * CloudOps - Pesquisa API Handler
 * CRUD de pesquisas e busca de candidatos
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const PESQUISAS_TABLE = process.env.PESQUISAS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC_ARN;

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
    const path = event.path;

    try {
        // Rotas especiais
        if (path.includes('/candidatos')) {
            return await getCandidatos(pathParams.pesquisaId);
        }

        if (path.includes('/candidatar')) {
            return await candidatar(pathParams.pesquisaId, JSON.parse(event.body));
        }

        // CRUD básico
        switch (method) {
            case 'POST':
                return await createPesquisa(JSON.parse(event.body));
            
            case 'GET':
                if (pathParams.pesquisaId) {
                    return await getPesquisa(pathParams.pesquisaId);
                }
                return await listPesquisas(event.queryStringParameters);
            
            case 'PUT':
                return await updatePesquisa(pathParams.pesquisaId, JSON.parse(event.body));
            
            case 'DELETE':
                return await deletePesquisa(pathParams.pesquisaId);
            
            default:
                return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
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

async function createPesquisa(data) {
    const pesquisaId = uuidv4();
    const timestamp = new Date().toISOString();

    const pesquisa = {
        pesquisaId,
        professorId: data.professorId,
        professorNome: data.professorNome,
        
        // Informações básicas
        titulo: data.titulo,
        descricao: data.descricao,
        dataInicio: data.dataInicio,
        duracao: data.duracao,
        
        // Áreas e requisitos
        areas: data.areas || [],
        escolaridadeMinima: data.escolaridadeMinima,
        historicoPublicacao: parseInt(data.historicoPublicacao) || 0,
        idiomas: data.idiomas || [],
        habilidadesTecnicas: data.habilidadesTecnicas || [],
        instituicao: data.instituicao,
        
        // Participantes
        minParticipantes: parseInt(data.minParticipantes) || 2,
        maxParticipantes: parseInt(data.maxParticipantes) || 5,
        
        // Imprescindibilidade
        imprescindivel: data.imprescindivel || [],
        
        // Filtros adicionais
        filtrosAdicionais: data.filtrosAdicionais || {},
        
        // Controle
        status: 'ativa',
        candidatos: [],
        candidatosAceitos: [],
        grupoFormado: false,
        votacaoAberta: false,
        
        // Metadata
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await dynamoDB.send(new PutCommand({
        TableName: PESQUISAS_TABLE,
        Item: pesquisa
    }));

    // Notificar usuários compatíveis (async)
    notificarUsuariosCompativeis(pesquisa).catch(console.error);

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

async function getPesquisa(pesquisaId) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Pesquisa não encontrada' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}

async function listPesquisas(queryParams) {
    const params = { TableName: PESQUISAS_TABLE };
    
    // Filtros
    const filters = [];
    const expressionValues = {};
    const expressionNames = {};

    if (queryParams?.status) {
        filters.push('#status = :status');
        expressionNames['#status'] = 'status';
        expressionValues[':status'] = queryParams.status;
    }

    if (queryParams?.professorId) {
        params.IndexName = 'professor-index';
        params.KeyConditionExpression = 'professorId = :profId';
        expressionValues[':profId'] = queryParams.professorId;

        const result = await dynamoDB.send(new QueryCommand(params));
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                count: result.Items.length,
                pesquisas: result.Items
            })
        };
    }

    if (filters.length > 0) {
        params.FilterExpression = filters.join(' AND ');
        params.ExpressionAttributeNames = expressionNames;
        params.ExpressionAttributeValues = expressionValues;
    }

    params.Limit = parseInt(queryParams?.limit) || 50;
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

async function updatePesquisa(pesquisaId, data) {
    const updateExpressions = [];
    const expressionNames = {};
    const expressionValues = {};

    const allowedFields = [
        'titulo', 'descricao', 'dataInicio', 'duracao', 'areas',
        'escolaridadeMinima', 'historicoPublicacao', 'idiomas',
        'habilidadesTecnicas', 'minParticipantes', 'maxParticipantes',
        'imprescindivel', 'filtrosAdicionais', 'status'
    ];

    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            updateExpressions.push(`#${field} = :${field}`);
            expressionNames[`#${field}`] = field;
            expressionValues[`:${field}`] = data[field];
        }
    });

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionNames['#updatedAt'] = 'updatedAt';
    expressionValues[':updatedAt'] = new Date().toISOString();

    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Pesquisa atualizada!' })
    };
}

async function deletePesquisa(pesquisaId) {
    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'cancelada' }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Pesquisa cancelada!' })
    };
}

async function getCandidatos(pesquisaId) {
    const pesquisa = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!pesquisa.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Pesquisa não encontrada' })
        };
    }

    // Buscar detalhes dos candidatos
    const candidatosIds = pesquisa.Item.candidatos || [];
    const candidatos = [];

    for (const userId of candidatosIds) {
        const user = await dynamoDB.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId }
        }));
        if (user.Item) {
            candidatos.push(user.Item);
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            totalCandidatos: candidatos.length,
            candidatos
        })
    };
}

async function candidatar(pesquisaId, data) {
    const { userId } = data;

    // Adicionar candidato à pesquisa
    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: 'SET candidatos = list_append(if_not_exists(candidatos, :empty), :userId), updatedAt = :now',
        ExpressionAttributeValues: {
            ':userId': [userId],
            ':empty': [],
            ':now': new Date().toISOString()
        }
    }));

    // Verificar se atingiu número para votação
    const pesquisa = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    const numCandidatos = pesquisa.Item?.candidatos?.length || 0;
    const min = pesquisa.Item?.minParticipantes || 2;
    const max = pesquisa.Item?.maxParticipantes || 5;

    // Se atingiu entre min e 2*max, pode iniciar votação
    if (numCandidatos >= min && numCandidatos <= max * 2) {
        await dynamoDB.send(new UpdateCommand({
            TableName: PESQUISAS_TABLE,
            Key: { pesquisaId },
            UpdateExpression: 'SET votacaoAberta = :true',
            ExpressionAttributeValues: { ':true': true }
        }));
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Candidatura registrada!',
            totalCandidatos: numCandidatos,
            votacaoAberta: numCandidatos >= min
        })
    };
}

async function notificarUsuariosCompativeis(pesquisa) {
    try {
        await snsClient.send(new PublishCommand({
            TopicArn: NOTIFICATION_TOPIC,
            Message: JSON.stringify({
                type: 'nova-pesquisa',
                pesquisaId: pesquisa.pesquisaId,
                titulo: pesquisa.titulo,
                areas: pesquisa.areas
            }),
            Subject: `Nova pesquisa: ${pesquisa.titulo}`
        }));
    } catch (error) {
        console.log('SNS notification error:', error);
    }
}
