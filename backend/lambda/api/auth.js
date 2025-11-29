/**
 * CloudOps - Auth API Handler
 * Gerencia autenticação e registro de usuários via Cognito
 */

const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
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

    const path = event.path;
    const method = event.httpMethod;

    try {
        // POST /auth/register - Registro de novo usuário
        if (path === '/auth/register' && method === 'POST') {
            return await register(JSON.parse(event.body));
        }

        // POST /auth/confirm - Confirmar email
        if (path === '/auth/confirm' && method === 'POST') {
            return await confirmSignUp(JSON.parse(event.body));
        }

        // POST /auth/login - Login
        if (path === '/auth/login' && method === 'POST') {
            return await login(JSON.parse(event.body));
        }

        // GET /auth/me - Dados do usuário logado
        if (path === '/auth/me' && method === 'GET') {
            return await getMe(event);
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Rota não encontrada' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: error.statusCode || 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Erro interno do servidor',
                code: error.name
            })
        };
    }
};

async function register(data) {
    const { email, password, nome, tipoUsuario } = data;

    if (!email || !password || !nome || !tipoUsuario) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Campos obrigatórios: email, password, nome, tipoUsuario' })
        };
    }

    // Registrar no Cognito
    await cognitoClient.send(new SignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: nome },
            { Name: 'custom:userType', Value: tipoUsuario }
        ]
    }));

    // Criar perfil no DynamoDB
    const userId = uuidv4();
    const timestamp = new Date().toISOString();

    await dynamoDB.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: {
            userId,
            email,
            nome,
            tipoUsuario,
            status: 'pendente',
            createdAt: timestamp,
            updatedAt: timestamp
        }
    }));

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
            message: 'Usuário registrado! Verifique seu email para confirmar.',
            userId
        })
    };
}

async function confirmSignUp(data) {
    const { email, code } = data;

    await cognitoClient.send(new ConfirmSignUpCommand({
        ClientId: USER_POOL_CLIENT_ID,
        Username: email,
        ConfirmationCode: code
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Email confirmado com sucesso!' })
    };
}

async function login(data) {
    const { email, password } = data;

    const result = await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: USER_POOL_CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password
        }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Login realizado com sucesso!',
            tokens: {
                accessToken: result.AuthenticationResult.AccessToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
                idToken: result.AuthenticationResult.IdToken,
                expiresIn: result.AuthenticationResult.ExpiresIn
            }
        })
    };
}

async function getMe(event) {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Token não fornecido' })
        };
    }

    const token = authHeader.replace('Bearer ', '');

    const cognitoUser = await cognitoClient.send(new GetUserCommand({
        AccessToken: token
    }));

    const email = cognitoUser.UserAttributes.find(a => a.Name === 'email')?.Value;

    // Buscar dados completos do DynamoDB
    const result = await dynamoDB.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { email }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item || cognitoUser)
    };
}
