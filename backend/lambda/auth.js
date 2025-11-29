const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, AdminConfirmSignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const path = event.path;
        const body = event.body ? JSON.parse(event.body) : {};

        if (path.endsWith('/register')) {
            return await register(body, headers);
        } else if (path.endsWith('/login')) {
            return await login(body, headers);
        } else if (path.endsWith('/confirm')) {
            return await confirmEmail(body, headers);
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Rota não encontrada' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro interno do servidor',
                message: error.message 
            })
        };
    }
};

async function register(data, headers) {
    const { email, password, nome, tipoUsuario } = data;

    if (!email || !password || !nome) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email, senha e nome são obrigatórios' })
        };
    }

    try {
        // Registrar no Cognito
        const signUpResponse = await cognitoClient.send(new SignUpCommand({
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'name', Value: nome },
                { Name: 'custom:userType', Value: tipoUsuario || 'aluno' }
            ]
        }));

        const userId = signUpResponse.UserSub;

        // Criar perfil básico no DynamoDB
        await dynamoDB.send(new PutCommand({
            TableName: USERS_TABLE,
            Item: {
                userId,
                email,
                nome,
                tipoUsuario: tipoUsuario || 'aluno',
                perfilCompleto: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        }));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Usuário registrado com sucesso! Verifique seu email para confirmar.',
                userId,
                userConfirmed: signUpResponse.UserConfirmed
            })
        };
    } catch (error) {
        console.error('Register error:', error);
        
        if (error.name === 'UsernameExistsException') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email já cadastrado' })
            };
        }

        throw error;
    }
}

async function confirmEmail(data, headers) {
    const { email, code } = data;

    if (!email || !code) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email e código são obrigatórios' })
        };
    }

    try {
        await cognitoClient.send(new ConfirmSignUpCommand({
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: code
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Email confirmado com sucesso! Você já pode fazer login.' 
            })
        };
    } catch (error) {
        console.error('Confirm error:', error);
        
        if (error.name === 'CodeMismatchException') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Código de confirmação inválido' })
            };
        }

        throw error;
    }
}

async function login(data, headers) {
    const { email, password } = data;

    if (!email || !password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Email e senha são obrigatórios' })
        };
    }

    try {
        const authResponse = await cognitoClient.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        }));

        const { AuthenticationResult } = authResponse;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Login realizado com sucesso!',
                accessToken: AuthenticationResult.AccessToken,
                idToken: AuthenticationResult.IdToken,
                refreshToken: AuthenticationResult.RefreshToken,
                expiresIn: AuthenticationResult.ExpiresIn
            })
        };
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.name === 'NotAuthorizedException') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Email ou senha incorretos' })
            };
        }

        if (error.name === 'UserNotConfirmedException') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Email não confirmado. Verifique sua caixa de entrada.' })
            };
        }

        throw error;
    }
}
