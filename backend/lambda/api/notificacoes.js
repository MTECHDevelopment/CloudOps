/**
 * CloudOps - Notificações API Handler
 * Sistema de notificações push e email
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand, SubscribeCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const NOTIFICATION_TOPIC = process.env.NOTIFICATION_TOPIC_ARN;

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Tabela inline para notificações (pode ser movida para DynamoDB depois)
let notificationsStore = new Map();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Se veio do SNS, processar notificação
    if (event.Records && event.Records[0]?.Sns) {
        return await processSnsNotification(event.Records[0].Sns);
    }

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const method = event.httpMethod;
    const pathParams = event.pathParameters || {};
    const path = event.path;

    try {
        // POST /notificacao - Enviar notificação
        if (method === 'POST' && path === '/notificacao') {
            return await sendNotification(JSON.parse(event.body));
        }

        // GET /notificacoes - Listar notificações do usuário
        if (method === 'GET' && path === '/notificacoes') {
            const userId = event.queryStringParameters?.userId || 
                          event.requestContext?.authorizer?.claims?.sub;
            return await getNotificacoes(userId);
        }

        // PUT /notificacao/{id}/read - Marcar como lida
        if (method === 'PUT' && pathParams.id && path.includes('/read')) {
            return await markAsRead(pathParams.id);
        }

        // POST /notificacao/subscribe - Inscrever para notificações
        if (method === 'POST' && path.includes('/subscribe')) {
            return await subscribeUser(JSON.parse(event.body));
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
 * Processa notificação recebida do SNS
 */
async function processSnsNotification(snsMessage) {
    try {
        const data = JSON.parse(snsMessage.Message);
        console.log('SNS Notification:', data);

        // Armazenar notificação para o usuário
        const notificationId = uuidv4();
        const notification = {
            notificationId,
            userId: data.userId,
            type: data.type,
            title: snsMessage.Subject || 'Nova notificação',
            message: data.mensagem || data.message,
            data: data,
            read: false,
            createdAt: new Date().toISOString()
        };

        // Armazenar (em produção usar DynamoDB)
        if (!notificationsStore.has(data.userId)) {
            notificationsStore.set(data.userId, []);
        }
        notificationsStore.get(data.userId).unshift(notification);

        // Manter apenas últimas 100 notificações
        const userNotifications = notificationsStore.get(data.userId);
        if (userNotifications.length > 100) {
            notificationsStore.set(data.userId, userNotifications.slice(0, 100));
        }

        console.log('Notification stored:', notificationId);
        return { statusCode: 200, body: 'OK' };

    } catch (error) {
        console.error('Error processing SNS:', error);
        throw error;
    }
}

/**
 * Envia notificação via SNS
 */
async function sendNotification(data) {
    const { userId, type, title, message, pesquisaId } = data;

    const timestamp = new Date().toISOString();

    // Publicar no SNS
    await snsClient.send(new PublishCommand({
        TopicArn: NOTIFICATION_TOPIC,
        Message: JSON.stringify({
            type,
            userId,
            pesquisaId,
            message,
            timestamp
        }),
        Subject: title
    }));

    // Também armazenar localmente
    const notificationId = uuidv4();
    const notification = {
        notificationId,
        userId,
        type,
        title,
        message,
        data: { pesquisaId },
        read: false,
        createdAt: timestamp
    };

    if (!notificationsStore.has(userId)) {
        notificationsStore.set(userId, []);
    }
    notificationsStore.get(userId).unshift(notification);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Notificação enviada!',
            notificationId
        })
    };
}

/**
 * Busca notificações do usuário
 */
async function getNotificacoes(userId) {
    if (!userId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId é obrigatório' })
        };
    }

    const notifications = notificationsStore.get(userId) || [];

    // Separar por status
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            userId,
            total: notifications.length,
            unreadCount: unread.length,
            notifications: notifications.slice(0, 50)
        })
    };
}

/**
 * Marca notificação como lida
 */
async function markAsRead(notificationId) {
    // Buscar em todas as notificações
    for (const [userId, notifications] of notificationsStore) {
        const notification = notifications.find(n => n.notificationId === notificationId);
        if (notification) {
            notification.read = true;
            notification.readAt = new Date().toISOString();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Notificação marcada como lida' })
            };
        }
    }

    return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Notificação não encontrada' })
    };
}

/**
 * Inscreve usuário para receber notificações por email
 */
async function subscribeUser(data) {
    const { email, userId } = data;

    try {
        await snsClient.send(new SubscribeCommand({
            TopicArn: NOTIFICATION_TOPIC,
            Protocol: 'email',
            Endpoint: email,
            Attributes: {
                FilterPolicy: JSON.stringify({
                    userId: [userId]
                })
            }
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Inscrição realizada. Verifique seu email para confirmar.'
            })
        };

    } catch (error) {
        console.error('Subscribe error:', error);
        throw error;
    }
}

/**
 * Tipos de notificação suportados
 */
const NotificationTypes = {
    NOVA_PESQUISA: 'nova-pesquisa',
    MATCH: 'match',
    VOTACAO_INICIADA: 'votacao-iniciada',
    GRUPO_FORMADO: 'grupo-formado',
    CANDIDATURA_RECEBIDA: 'candidatura-recebida',
    CANDIDATURA_ACEITA: 'candidatura-aceita',
    CANDIDATURA_REJEITADA: 'candidatura-rejeitada',
    LEMBRETE: 'lembrete',
    SISTEMA: 'sistema'
};

/**
 * Templates de notificação
 */
function getNotificationTemplate(type, data) {
    const templates = {
        'nova-pesquisa': {
            title: 'Nova Pesquisa Disponível',
            message: `Uma nova pesquisa "${data.titulo}" foi publicada que combina com seu perfil!`
        },
        'match': {
            title: 'Novo Match!',
            message: `Você tem ${data.score}% de compatibilidade com a pesquisa "${data.titulo}".`
        },
        'votacao-iniciada': {
            title: 'Votação Iniciada',
            message: `A votação para a pesquisa "${data.titulo}" começou. Entre e vote nos candidatos!`
        },
        'grupo-formado': {
            title: 'Parabéns! Grupo Formado',
            message: `Você foi selecionado para participar da pesquisa "${data.titulo}".`
        },
        'candidatura-recebida': {
            title: 'Nova Candidatura',
            message: `${data.candidatoNome} se candidatou para sua pesquisa "${data.titulo}".`
        },
        'candidatura-aceita': {
            title: 'Candidatura Aceita!',
            message: `Sua candidatura para "${data.titulo}" foi aceita!`
        },
        'candidatura-rejeitada': {
            title: 'Candidatura Não Selecionada',
            message: `Infelizmente sua candidatura para "${data.titulo}" não foi selecionada desta vez.`
        }
    };

    return templates[type] || {
        title: 'Notificação',
        message: data.message || 'Você tem uma nova notificação.'
    };
}
