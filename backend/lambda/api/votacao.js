/**
 * CloudOps - Votação API Handler
 * Sistema de votação estilo Tinder para formação de grupos
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const PESQUISAS_TABLE = process.env.PESQUISAS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const VOTACOES_TABLE = process.env.VOTACOES_TABLE;
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
        // POST /votacao/iniciar - Iniciar votação para uma pesquisa
        if (method === 'POST' && path.includes('/iniciar')) {
            return await iniciarVotacao(JSON.parse(event.body));
        }

        // GET /votacao/{pesquisaId} - Obter status da votação
        if (method === 'GET' && pathParams.pesquisaId && !pathParams.userId) {
            return await getVotacaoStatus(pathParams.pesquisaId);
        }

        // GET /votacao/{pesquisaId}/candidatos/{userId} - Obter candidatos para votar
        if (method === 'GET' && pathParams.pesquisaId && pathParams.userId) {
            return await getCandidatosParaVotar(pathParams.pesquisaId, pathParams.userId);
        }

        // POST /votacao/votar - Registrar voto (aceitar/rejeitar)
        if (method === 'POST' && path.includes('/votar')) {
            return await registrarVoto(JSON.parse(event.body));
        }

        // POST /votacao/finalizar - Finalizar votação e formar grupos
        if (method === 'POST' && path.includes('/finalizar')) {
            return await finalizarVotacao(JSON.parse(event.body));
        }

        // GET /votacao/{pesquisaId}/resultado - Ver resultado da votação
        if (method === 'GET' && path.includes('/resultado')) {
            return await getResultadoVotacao(pathParams.pesquisaId);
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
 * Inicia o processo de votação para uma pesquisa
 */
async function iniciarVotacao(data) {
    const { pesquisaId, candidatos } = data;

    // Buscar pesquisa
    const pesquisaResult = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!pesquisaResult.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não encontrada' }) };
    }

    const pesquisa = pesquisaResult.Item;
    const timestamp = new Date().toISOString();

    // Atualizar status da pesquisa para votação aberta
    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: 'SET #status = :status, votacaoIniciada = :data, candidatosVotacao = :candidatos',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':status': 'votacao-aberta',
            ':data': timestamp,
            ':candidatos': candidatos
        }
    }));

    // Criar registro de votação para cada par de candidatos
    const votacaoId = uuidv4();
    const totalPares = (candidatos.length * (candidatos.length - 1)) / 2;
    
    await dynamoDB.send(new PutCommand({
        TableName: VOTACOES_TABLE,
        Item: {
            votacaoId,
            pesquisaId,
            status: 'em-andamento',
            candidatos,
            totalCandidatos: candidatos.length,
            totalPares,
            votosRegistrados: 0,
            createdAt: timestamp
        }
    }));

    // Notificar candidatos
    for (const candidatoId of candidatos) {
        await notificarCandidato(candidatoId, pesquisa, 'votacao-iniciada');
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Votação iniciada com sucesso!',
            votacaoId,
            pesquisaId,
            totalCandidatos: candidatos.length,
            totalPares
        })
    };
}

/**
 * Retorna status da votação
 */
async function getVotacaoStatus(pesquisaId) {
    const result = await dynamoDB.send(new ScanCommand({
        TableName: VOTACOES_TABLE,
        FilterExpression: 'pesquisaId = :pid',
        ExpressionAttributeValues: { ':pid': pesquisaId }
    }));

    if (!result.Items || result.Items.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Votação não encontrada' }) };
    }

    const votacao = result.Items[0];

    // Buscar votos já registrados
    const votosResult = await dynamoDB.send(new ScanCommand({
        TableName: VOTACOES_TABLE,
        FilterExpression: 'pesquisaId = :pid AND attribute_exists(votanteId)',
        ExpressionAttributeValues: { ':pid': pesquisaId }
    }));

    const votos = votosResult.Items || [];

    // Calcular progresso por candidato
    const progressoPorCandidato = {};
    for (const candidatoId of votacao.candidatos) {
        const votosDo = votos.filter(v => v.votanteId === candidatoId);
        progressoPorCandidato[candidatoId] = {
            votosFeitos: votosDo.length,
            votosNecessarios: votacao.candidatos.length - 1
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            votacaoId: votacao.votacaoId,
            pesquisaId,
            status: votacao.status,
            totalCandidatos: votacao.totalCandidatos,
            totalVotosEsperados: votacao.totalPares * 2, // cada par vota um no outro
            votosRegistrados: votos.length,
            percentualConcluido: Math.round((votos.length / (votacao.totalPares * 2)) * 100),
            progressoPorCandidato
        })
    };
}

/**
 * Retorna candidatos para um usuário votar
 */
async function getCandidatosParaVotar(pesquisaId, userId) {
    // Buscar votação
    const votacaoResult = await dynamoDB.send(new ScanCommand({
        TableName: VOTACOES_TABLE,
        FilterExpression: 'pesquisaId = :pid AND attribute_not_exists(votanteId)',
        ExpressionAttributeValues: { ':pid': pesquisaId }
    }));

    if (!votacaoResult.Items || votacaoResult.Items.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Votação não encontrada' }) };
    }

    const votacao = votacaoResult.Items[0];

    // Verificar se usuário é candidato
    if (!votacao.candidatos.includes(userId)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuário não é candidato desta votação' }) };
    }

    // Buscar votos já feitos por este usuário
    const votosResult = await dynamoDB.send(new ScanCommand({
        TableName: VOTACOES_TABLE,
        FilterExpression: 'pesquisaId = :pid AND votanteId = :uid',
        ExpressionAttributeValues: { 
            ':pid': pesquisaId,
            ':uid': userId 
        }
    }));

    const votosFeitos = votosResult.Items?.map(v => v.candidatoId) || [];

    // Filtrar candidatos não votados
    const candidatosParaVotar = votacao.candidatos.filter(c => 
        c !== userId && !votosFeitos.includes(c)
    );

    // Buscar dados dos candidatos
    const candidatosComDados = [];
    for (const candidatoId of candidatosParaVotar) {
        const userResult = await dynamoDB.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: candidatoId }
        }));

        if (userResult.Item) {
            const user = userResult.Item;
            candidatosComDados.push({
                userId: user.userId,
                nome: user.nome,
                instituicao: user.instituicao,
                escolaridade: user.escolaridade,
                areasInteresse: user.areasInteresse,
                habilidades: user.habilidades,
                numPublicacoes: user.numPublicacoes,
                idiomas: user.idiomas,
                foto: user.foto
            });
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            userId,
            votosFeitos: votosFeitos.length,
            votosRestantes: candidatosComDados.length,
            candidatos: candidatosComDados
        })
    };
}

/**
 * Registra um voto (aceitar ou rejeitar)
 */
async function registrarVoto(data) {
    const { pesquisaId, votanteId, candidatoId, voto, comentario } = data;
    const timestamp = new Date().toISOString();

    // Validar voto
    if (!['aceitar', 'rejeitar'].includes(voto)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Voto inválido. Use "aceitar" ou "rejeitar"' }) };
    }

    // Registrar voto
    const votoId = `${pesquisaId}#${votanteId}#${candidatoId}`;
    await dynamoDB.send(new PutCommand({
        TableName: VOTACOES_TABLE,
        Item: {
            votoId,
            pesquisaId,
            votanteId,
            candidatoId,
            voto,
            comentario,
            createdAt: timestamp
        }
    }));

    // Verificar se é match mútuo (ambos aceitaram)
    const votoInverso = await dynamoDB.send(new GetCommand({
        TableName: VOTACOES_TABLE,
        Key: { votoId: `${pesquisaId}#${candidatoId}#${votanteId}` }
    }));

    let isMutualMatch = false;
    if (votoInverso.Item && votoInverso.Item.voto === 'aceitar' && voto === 'aceitar') {
        isMutualMatch = true;
        
        // Registrar match mútuo
        await dynamoDB.send(new PutCommand({
            TableName: MATCHES_TABLE,
            Item: {
                matchId: `mutual#${pesquisaId}#${votanteId}#${candidatoId}`,
                pesquisaId,
                user1: votanteId,
                user2: candidatoId,
                tipo: 'mutual',
                createdAt: timestamp
            }
        }));
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: 'Voto registrado com sucesso!',
            voto,
            isMutualMatch
        })
    };
}

/**
 * Finaliza votação e forma grupos baseado nos votos
 */
async function finalizarVotacao(data) {
    const { pesquisaId } = data;
    const timestamp = new Date().toISOString();

    // Buscar pesquisa
    const pesquisaResult = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!pesquisaResult.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não encontrada' }) };
    }

    const pesquisa = pesquisaResult.Item;
    const minParticipantes = pesquisa.minParticipantes;
    const maxParticipantes = pesquisa.maxParticipantes;

    // Buscar todos os votos
    const votosResult = await dynamoDB.send(new ScanCommand({
        TableName: VOTACOES_TABLE,
        FilterExpression: 'pesquisaId = :pid AND attribute_exists(votanteId)',
        ExpressionAttributeValues: { ':pid': pesquisaId }
    }));

    const votos = votosResult.Items || [];

    // Construir grafo de afinidade
    const afinidadeMatrix = {};
    const candidatos = [...new Set(votos.flatMap(v => [v.votanteId, v.candidatoId]))];

    for (const c of candidatos) {
        afinidadeMatrix[c] = {};
        for (const c2 of candidatos) {
            afinidadeMatrix[c][c2] = 0;
        }
    }

    // Calcular afinidades
    for (const voto of votos) {
        if (voto.voto === 'aceitar') {
            afinidadeMatrix[voto.votanteId][voto.candidatoId] += 1;
        }
    }

    // Identificar matches mútuos
    const matchesMutuos = [];
    for (const c1 of candidatos) {
        for (const c2 of candidatos) {
            if (c1 < c2 && afinidadeMatrix[c1][c2] > 0 && afinidadeMatrix[c2][c1] > 0) {
                matchesMutuos.push({
                    user1: c1,
                    user2: c2,
                    afinidadeTotal: afinidadeMatrix[c1][c2] + afinidadeMatrix[c2][c1]
                });
            }
        }
    }

    // Ordenar por afinidade
    matchesMutuos.sort((a, b) => b.afinidadeTotal - a.afinidadeTotal);

    // Algoritmo guloso para formar grupo
    const grupoFinal = [];
    const usados = new Set();

    // Começar com o par de maior afinidade
    if (matchesMutuos.length > 0) {
        const primeiro = matchesMutuos[0];
        grupoFinal.push(primeiro.user1, primeiro.user2);
        usados.add(primeiro.user1);
        usados.add(primeiro.user2);
    }

    // Adicionar candidatos com maior afinidade média ao grupo
    while (grupoFinal.length < maxParticipantes && usados.size < candidatos.length) {
        let melhorCandidato = null;
        let melhorAfinidade = -1;

        for (const candidato of candidatos) {
            if (usados.has(candidato)) continue;

            // Calcular afinidade média com o grupo atual
            let afinidadeMedia = 0;
            for (const membro of grupoFinal) {
                afinidadeMedia += afinidadeMatrix[candidato][membro] + afinidadeMatrix[membro][candidato];
            }
            afinidadeMedia /= grupoFinal.length * 2;

            if (afinidadeMedia > melhorAfinidade) {
                melhorAfinidade = afinidadeMedia;
                melhorCandidato = candidato;
            }
        }

        if (melhorCandidato && melhorAfinidade > 0) {
            grupoFinal.push(melhorCandidato);
            usados.add(melhorCandidato);
        } else {
            break;
        }
    }

    // Verificar se atingiu mínimo
    const grupoFormado = grupoFinal.length >= minParticipantes;

    // Atualizar pesquisa
    await dynamoDB.send(new UpdateCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId },
        UpdateExpression: 'SET #status = :status, grupoFinal = :grupo, votacaoFinalizada = :data',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':status': grupoFormado ? 'grupo-formado' : 'votacao-inconclusiva',
            ':grupo': grupoFinal,
            ':data': timestamp
        }
    }));

    // Notificar participantes
    for (const participanteId of grupoFinal) {
        await notificarCandidato(participanteId, pesquisa, 'grupo-formado');
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: grupoFormado 
                ? 'Grupo formado com sucesso!' 
                : 'Votação inconclusiva - não atingiu mínimo de participantes',
            pesquisaId,
            grupoFormado,
            totalParticipantes: grupoFinal.length,
            minNecessario: minParticipantes,
            maxPermitido: maxParticipantes,
            grupo: grupoFinal,
            matchesMutuos: matchesMutuos.length
        })
    };
}

/**
 * Retorna resultado da votação
 */
async function getResultadoVotacao(pesquisaId) {
    const pesquisaResult = await dynamoDB.send(new GetCommand({
        TableName: PESQUISAS_TABLE,
        Key: { pesquisaId }
    }));

    if (!pesquisaResult.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Pesquisa não encontrada' }) };
    }

    const pesquisa = pesquisaResult.Item;

    // Buscar dados do grupo final
    const grupoFinal = pesquisa.grupoFinal || [];
    const membrosComDados = [];

    for (const membroId of grupoFinal) {
        const userResult = await dynamoDB.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: membroId }
        }));

        if (userResult.Item) {
            const user = userResult.Item;
            membrosComDados.push({
                userId: user.userId,
                nome: user.nome,
                email: user.email,
                instituicao: user.instituicao,
                escolaridade: user.escolaridade,
                areasInteresse: user.areasInteresse
            });
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            titulo: pesquisa.titulo,
            status: pesquisa.status,
            grupoFormado: pesquisa.status === 'grupo-formado',
            votacaoFinalizada: pesquisa.votacaoFinalizada,
            totalParticipantes: membrosComDados.length,
            minNecessario: pesquisa.minParticipantes,
            maxPermitido: pesquisa.maxParticipantes,
            membros: membrosComDados
        })
    };
}

async function notificarCandidato(userId, pesquisa, tipo) {
    try {
        const mensagens = {
            'votacao-iniciada': `A votação para a pesquisa "${pesquisa.titulo}" foi iniciada. Entre e vote nos candidatos!`,
            'grupo-formado': `Parabéns! Você foi selecionado para a pesquisa "${pesquisa.titulo}".`
        };

        await snsClient.send(new PublishCommand({
            TopicArn: NOTIFICATION_TOPIC,
            Message: JSON.stringify({
                type: tipo,
                userId,
                pesquisaId: pesquisa.pesquisaId,
                titulo: pesquisa.titulo,
                mensagem: mensagens[tipo]
            }),
            Subject: `CloudOps - ${tipo === 'votacao-iniciada' ? 'Votação Iniciada' : 'Grupo Formado'}`
        }));
    } catch (error) {
        console.error('Notification error:', error);
    }
}
