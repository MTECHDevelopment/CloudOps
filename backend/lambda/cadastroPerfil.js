const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.USERS_TABLE;

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        if (event.httpMethod === 'POST') {
            return await createProfile(JSON.parse(event.body), headers);
        } else if (event.httpMethod === 'GET') {
            return await getProfile(event.pathParameters.userId, headers);
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

async function createProfile(data, headers) {
    const userId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const user = {
        userId,
        email: data.email,
        nome: data.nome,
        tipoUsuario: data.tipoUsuario,
        localizacao: data.localizacao,
        nacionalidade: data.nacionalidade,
        escolaridade: data.escolaridade,
        curso: data.curso,
        instituicao: data.instituicao,
        anosExperiencia: data.anosExperiencia || 0,
        numPublicacoes: data.numPublicacoes || 0,
        linkLattes: data.linkLattes,
        linkOrcid: data.linkOrcid,
        areasInteresse: data.areasInteresse || [],
        habilidades: data.habilidades || [],
        idiomas: data.idiomas || [],
        disponibilidade: data.disponibilidade,
        modalidade: data.modalidade,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await dynamoDB.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: user
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
            message: 'Perfil criado com sucesso!',
            userId: userId,
            user 
        })
    };
}

async function getProfile(userId, headers) {
    const result = await dynamoDB.send(new GetCommand({
        TableName: TABLE_NAME,
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
