/**
 * CloudOps - Matching Engine API Handler
 * Algoritmo de matching entre perfis e pesquisas
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const PESQUISAS_TABLE = process.env.PESQUISAS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC_ARN;

// Níveis de escolaridade para comparação hierárquica
const ESCOLARIDADE_LEVELS = {
    'ensino-medio': 1,
    'superior-incompleto': 2,
    'superior-completo': 3,
    'pos-graduacao': 4,
    'mestrado': 5,
    'doutorado': 6,
    'pos-doutorado': 7
};

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
        // GET /matches/{pesquisaId} - Buscar matches para uma pesquisa
        if (method === 'GET' && pathParams.pesquisaId) {
            return await findMatchesForPesquisa(pathParams.pesquisaId, event.queryStringParameters);
        }

        // GET /matches/user/{userId} - Matches de um usuário
        if (method === 'GET' && pathParams.userId) {
            return await findMatchesForUser(pathParams.userId);
        }

        // POST /matches/accept - Aceitar match
        if (method === 'POST' && path.includes('/accept')) {
            return await acceptMatch(JSON.parse(event.body));
        }

        // POST /matches/reject - Rejeitar match
        if (method === 'POST' && path.includes('/reject')) {
            return await rejectMatch(JSON.parse(event.body));
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Rota não encontrada' }) };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Erro interno' })
        };
    }
};

/**
 * Encontra matches compatíveis para uma pesquisa
 */
async function findMatchesForPesquisa(pesquisaId, queryParams) {
    // 1. Buscar dados da pesquisa
    const pesquisaResult = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!pesquisaResult.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Pesquisa não encontrada' })
        };
    }

    const pesquisa = pesquisaResult.Item;

    // 2. Buscar todos os usuários ativos
    const usersResult = await dynamoDB.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: '#status = :status AND userId <> :profId',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { 
            ':status': 'ativo',
            ':profId': pesquisa.professorId
        }
    }));

    const users = usersResult.Items || [];

    // 3. Calcular compatibilidade de cada usuário
    const allMatches = users.map(user => {
        const compatibility = calculateCompatibility(user, pesquisa);
        return {
            userId: user.userId,
            nome: user.nome,
            email: user.email,
            tipoUsuario: user.tipoUsuario,
            instituicao: user.instituicao,
            escolaridade: user.escolaridade,
            areasInteresse: user.areasInteresse,
            habilidades: user.habilidades,
            numPublicacoes: user.numPublicacoes,
            idiomas: user.idiomas,
            ...compatibility
        };
    });

    // 4. Filtrar apenas compatíveis (passou nos imprescindíveis)
    const compatibleMatches = allMatches
        .filter(match => match.isCompatible)
        .sort((a, b) => b.score - a.score);

    // 5. Verificar se precisa refinar
    const maxCandidatos = pesquisa.maxParticipantes * 2;
    const needsRefining = compatibleMatches.length > maxCandidatos;

    // 6. Salvar matches no banco
    const timestamp = new Date().toISOString();
    for (const match of compatibleMatches.slice(0, maxCandidatos)) {
        await dynamoDB.send(new PutCommand({
            TableName: MATCHES_TABLE,
            Item: {
                matchId: `${pesquisaId}#${match.userId}`,
                pesquisaId,
                userId: match.userId,
                score: match.score,
                breakdown: match.breakdown,
                status: 'pendente',
                createdAt: timestamp
            }
        }));
    }

    // 7. Notificar usuários compatíveis (top matches)
    if (!queryParams?.skipNotification) {
        notifyMatches(pesquisa, compatibleMatches.slice(0, 10)).catch(console.error);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            titulo: pesquisa.titulo,
            totalAnalyzed: users.length,
            totalCompatible: compatibleMatches.length,
            needsRefining,
            message: needsRefining 
                ? `Encontradas ${compatibleMatches.length} pessoas compatíveis. Considere refinar a pesquisa.`
                : `Encontrados ${compatibleMatches.length} candidatos compatíveis.`,
            minParticipantes: pesquisa.minParticipantes,
            maxParticipantes: pesquisa.maxParticipantes,
            matches: compatibleMatches.slice(0, maxCandidatos)
        })
    };
}

/**
 * Encontra pesquisas compatíveis para um usuário
 */
async function findMatchesForUser(userId) {
    // Buscar perfil do usuário
    const userResult = await dynamoDB.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId }
    }));

    if (!userResult.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Usuário não encontrado' })
        };
    }

    const user = userResult.Item;

    // Buscar pesquisas ativas
    const pesquisasResult = await dynamoDB.send(new ScanCommand({
        TableName: PESQUISAS_TABLE,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'ativa' }
    }));

    const pesquisas = pesquisasResult.Items || [];

    // Calcular compatibilidade com cada pesquisa
    const matches = pesquisas.map(pesquisa => {
        const compatibility = calculateCompatibility(user, pesquisa);
        return {
            pesquisaId: pesquisa.pesquisaId,
            titulo: pesquisa.titulo,
            descricao: pesquisa.descricao,
            professorNome: pesquisa.professorNome,
            instituicao: pesquisa.instituicao,
            areas: pesquisa.areas,
            ...compatibility
        };
    })
    .filter(match => match.isCompatible)
    .sort((a, b) => b.score - a.score);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            userId,
            nome: user.nome,
            totalMatches: matches.length,
            matches
        })
    };
}

/**
 * Calcula compatibilidade entre usuário e pesquisa
 */
function calculateCompatibility(user, pesquisa) {
    const breakdown = {};
    let totalScore = 0;
    let totalWeight = 0;
    let isCompatible = true;
    const imprescindivel = pesquisa.imprescindivel || [];

    // 1. Áreas de Interesse (peso 30)
    const areaScore = calculateArrayMatch(user.areasInteresse, pesquisa.areas);
    breakdown.areas = areaScore;
    totalScore += areaScore * 30;
    totalWeight += 30;
    
    if (imprescindivel.includes('areas') && areaScore < 100) {
        isCompatible = false;
    }

    // 2. Escolaridade (peso 20)
    const escolaridadeScore = calculateEscolaridadeScore(user.escolaridade, pesquisa.escolaridadeMinima);
    breakdown.escolaridade = escolaridadeScore;
    totalScore += escolaridadeScore * 20;
    totalWeight += 20;
    
    if (imprescindivel.includes('escolaridade') && escolaridadeScore < 100) {
        isCompatible = false;
    }

    // 3. Publicações (peso 15)
    const publicacoesScore = calculateMinimumScore(user.numPublicacoes || 0, pesquisa.historicoPublicacao || 0);
    breakdown.publicacoes = publicacoesScore;
    totalScore += publicacoesScore * 15;
    totalWeight += 15;
    
    if (imprescindivel.includes('publicacoes') && publicacoesScore < 100) {
        isCompatible = false;
    }

    // 4. Idiomas (peso 15)
    const idiomasScore = calculateArrayMatch(user.idiomas, pesquisa.idiomas);
    breakdown.idiomas = idiomasScore;
    totalScore += idiomasScore * 15;
    totalWeight += 15;
    
    if (imprescindivel.includes('idiomas') && idiomasScore < 100) {
        isCompatible = false;
    }

    // 5. Habilidades Técnicas (peso 20)
    const habilidadesScore = calculateFuzzyArrayMatch(user.habilidades, pesquisa.habilidadesTecnicas);
    breakdown.habilidades = habilidadesScore;
    totalScore += habilidadesScore * 20;
    totalWeight += 20;
    
    if (imprescindivel.includes('habilidades') && habilidadesScore < 100) {
        isCompatible = false;
    }

    // Score final
    const score = Math.round(totalScore / totalWeight);

    return {
        score,
        breakdown,
        isCompatible
    };
}

function calculateArrayMatch(userArray, requiredArray) {
    if (!requiredArray || requiredArray.length === 0) return 100;
    if (!userArray || userArray.length === 0) return 0;
    
    const normalizedUser = userArray.map(item => item.toLowerCase());
    const normalizedRequired = requiredArray.map(item => item.toLowerCase());
    
    const matches = normalizedRequired.filter(item => normalizedUser.includes(item));
    return Math.round((matches.length / normalizedRequired.length) * 100);
}

function calculateFuzzyArrayMatch(userArray, requiredArray) {
    if (!requiredArray || requiredArray.length === 0) return 100;
    if (!userArray || userArray.length === 0) return 0;
    
    const normalizedUser = userArray.map(item => item.toLowerCase());
    const normalizedRequired = requiredArray.map(item => item.toLowerCase());
    
    const matches = normalizedRequired.filter(req => 
        normalizedUser.some(user => user.includes(req) || req.includes(user))
    );
    return Math.round((matches.length / normalizedRequired.length) * 100);
}

function calculateEscolaridadeScore(userEsc, requiredEsc) {
    if (!requiredEsc) return 100;
    
    const userLevel = ESCOLARIDADE_LEVELS[userEsc] || 0;
    const requiredLevel = ESCOLARIDADE_LEVELS[requiredEsc] || 0;
    
    if (userLevel >= requiredLevel) return 100;
    return Math.round((userLevel / requiredLevel) * 100);
}

function calculateMinimumScore(userValue, requiredValue) {
    if (!requiredValue || requiredValue === 0) return 100;
    if (userValue >= requiredValue) return 100;
    return Math.round((userValue / requiredValue) * 100);
}

async function acceptMatch(data) {
    const { matchId, pesquisaId, userId } = data;

    await dynamoDB.send(new UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: { matchId: matchId || `${pesquisaId}#${userId}` },
        UpdateExpression: 'SET #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':status': 'aceito',
            ':now': new Date().toISOString()
        }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Match aceito!' })
    };
}

async function rejectMatch(data) {
    const { matchId, pesquisaId, userId } = data;

    await dynamoDB.send(new UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: { matchId: matchId || `${pesquisaId}#${userId}` },
        UpdateExpression: 'SET #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':status': 'rejeitado',
            ':now': new Date().toISOString()
        }
    }));

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Match rejeitado' })
    };
}

async function notifyMatches(pesquisa, matches) {
    for (const match of matches) {
        try {
            await snsClient.send(new PublishCommand({
                TopicArn: NOTIFICATION_TOPIC,
                Message: JSON.stringify({
                    type: 'match',
                    userId: match.userId,
                    pesquisaId: pesquisa.pesquisaId,
                    titulo: pesquisa.titulo,
                    score: match.score
                }),
                Subject: `Novo match: ${match.score}% compatível com "${pesquisa.titulo}"`
            }));
        } catch (error) {
            console.error('Notification error:', error);
        }
    }
}
