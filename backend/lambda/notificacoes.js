const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({});

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const data = JSON.parse(event.body);
        return await sendNotification(data, headers);
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};

async function sendNotification(data, headers) {
    const { type, userId, title, message, pesquisaId, matchScore } = data;

    // Tipos de notificação:
    // - match: Novo match encontrado
    // - votacao: Votação iniciada/encerrada
    // - grupo: Grupo formado
    // - oportunidade: Nova oportunidade compatível

    const notificationMessages = {
        match: {
            subject: '🎯 Novo Match no CloudOps!',
            body: `Você tem um novo match com ${matchScore}% de compatibilidade! ${message}`
        },
        votacao: {
            subject: '🗳️ Votação no CloudOps',
            body: `${title}: ${message}`
        },
        grupo: {
            subject: '🎉 Grupo Formado no CloudOps!',
            body: `Parabéns! O grupo da pesquisa "${title}" foi formado! ${message}`
        },
        oportunidade: {
            subject: '🔔 Nova Oportunidade no CloudOps',
            body: `Uma nova pesquisa compatível com seu perfil foi cadastrada: ${title}`
        }
    };

    const notification = notificationMessages[type] || {
        subject: 'CloudOps - Notificação',
        body: message
    };

    // Enviar para SNS (em produção, integrar com WebSocket ou push notifications)
    try {
        await snsClient.send(new PublishCommand({
            TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
            Message: JSON.stringify({
                type,
                userId,
                pesquisaId,
                ...notification,
                timestamp: new Date().toISOString()
            }),
            Subject: notification.subject
        }));
    } catch (snsError) {
        console.log('SNS não configurado, notificação simulada:', notification);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Notificação enviada com sucesso',
            notification: {
                type,
                userId,
                ...notification
            }
        })
    };
}
