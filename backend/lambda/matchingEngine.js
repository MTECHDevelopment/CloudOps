const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE;
const PESQUISAS_TABLE = process.env.PESQUISAS_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;

// Níveis de escolaridade para comparação
const ESCOLARIDADE_LEVELS = {
    'ensino-medio': 1,
    'superior-incompleto': 2,
    'superior-completo': 3,
    'pos-graduacao': 4,
    'mestrado': 5,
    'doutorado': 6,
    'pos-doutorado': 7
};

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const pesquisaId = event.pathParameters.pesquisaId;
        return await findMatches(pesquisaId, headers);
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};

async function findMatches(pesquisaId, headers) {
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

    // 2. Buscar todos os usuários
    const usersResult = await dynamoDB.send(new ScanCommand({
        TableName: USERS_TABLE
    }));

    const users = usersResult.Items || [];

    // 3. Calcular compatibilidade de cada usuário
    const matches = users
        .filter(user => user.userId !== pesquisa.professorId) // Excluir o próprio professor
        .map(user => {
            const compatibility = calculateCompatibility(user, pesquisa);
            return {
                userId: user.userId,
                nome: user.nome,
                tipoUsuario: user.tipoUsuario,
                instituicao: user.instituicao,
                escolaridade: user.escolaridade,
                areasInteresse: user.areasInteresse,
                habilidades: user.habilidades,
                numPublicacoes: user.numPublicacoes,
                idiomas: user.idiomas,
                ...compatibility
            };
        })
        .filter(match => match.isCompatible) // Só compatíveis nos imprescindíveis
        .sort((a, b) => b.score - a.score); // Ordenar por score

    // 4. Verificar se precisa refinar a pesquisa
    const maxCandidatos = pesquisa.maxParticipantes * 2;
    const needsRefining = matches.length > maxCandidatos;

    // 5. Salvar matches no banco
    for (const match of matches.slice(0, maxCandidatos)) {
        await dynamoDB.send(new PutCommand({
            TableName: MATCHES_TABLE,
            Item: {
                matchId: uuidv4(),
                pesquisaId,
                userId: match.userId,
                score: match.score,
                breakdown: match.breakdown,
                status: 'pendente',
                createdAt: new Date().toISOString()
            }
        }));
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            pesquisaId,
            totalCompatible: matches.length,
            needsRefining,
            message: needsRefining 
                ? `O sistema encontrou ${matches.length} pessoas compatíveis. Considere refinar sua pesquisa.`
                : `Encontrados ${matches.length} candidatos compatíveis.`,
            matches: matches.slice(0, maxCandidatos)
        })
    };
}

function calculateCompatibility(user, pesquisa) {
    const breakdown = {};
    let totalScore = 0;
    let totalWeight = 0;
    let isCompatible = true;
    const imprescindivel = pesquisa.imprescindivel || [];

    // 1. Áreas de Interesse (peso 30)
    const areaScore = calculateAreaScore(user.areasInteresse, pesquisa.areas);
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
    const publicacoesScore = calculatePublicacoesScore(user.numPublicacoes, pesquisa.historicoPublicacao);
    breakdown.publicacoes = publicacoesScore;
    totalScore += publicacoesScore * 15;
    totalWeight += 15;
    
    if (imprescindivel.includes('publicacoes') && publicacoesScore < 100) {
        isCompatible = false;
    }

    // 4. Idiomas (peso 15)
    const idiomasScore = calculateIdiomasScore(user.idiomas, pesquisa.idiomas);
    breakdown.idiomas = idiomasScore;
    totalScore += idiomasScore * 15;
    totalWeight += 15;
    
    if (imprescindivel.includes('idiomas') && idiomasScore < 100) {
        isCompatible = false;
    }

    // 5. Habilidades Técnicas (peso 20)
    const habilidadesScore = calculateHabilidadesScore(user.habilidades, pesquisa.habilidadesTecnicas);
    breakdown.habilidades = habilidadesScore;
    totalScore += habilidadesScore * 20;
    totalWeight += 20;
    
    if (imprescindivel.includes('habilidades') && habilidadesScore < 100) {
        isCompatible = false;
    }

    // Calcular score final
    const score = Math.round(totalScore / totalWeight);

    return {
        score,
        breakdown,
        isCompatible
    };
}

function calculateAreaScore(userAreas, pesquisaAreas) {
    if (!pesquisaAreas || pesquisaAreas.length === 0) return 100;
    if (!userAreas || userAreas.length === 0) return 0;
    
    const matches = pesquisaAreas.filter(area => userAreas.includes(area));
    return Math.round((matches.length / pesquisaAreas.length) * 100);
}

function calculateEscolaridadeScore(userEsc, requiredEsc) {
    if (!requiredEsc) return 100;
    
    const userLevel = ESCOLARIDADE_LEVELS[userEsc] || 0;
    const requiredLevel = ESCOLARIDADE_LEVELS[requiredEsc] || 0;
    
    if (userLevel >= requiredLevel) return 100;
    return Math.round((userLevel / requiredLevel) * 100);
}

function calculatePublicacoesScore(userPubs, requiredPubs) {
    if (!requiredPubs || requiredPubs === 0) return 100;
    if (userPubs >= requiredPubs) return 100;
    return Math.round((userPubs / requiredPubs) * 100);
}

function calculateIdiomasScore(userIdiomas, requiredIdiomas) {
    if (!requiredIdiomas || requiredIdiomas.length === 0) return 100;
    if (!userIdiomas || userIdiomas.length === 0) return 0;
    
    const matches = requiredIdiomas.filter(idioma => userIdiomas.includes(idioma));
    return Math.round((matches.length / requiredIdiomas.length) * 100);
}

function calculateHabilidadesScore(userHabs, requiredHabs) {
    if (!requiredHabs || requiredHabs.length === 0) return 100;
    if (!userHabs || userHabs.length === 0) return 0;
    
    const normalizedUser = userHabs.map(h => h.toLowerCase());
    const normalizedRequired = requiredHabs.map(h => h.toLowerCase());
    
    const matches = normalizedRequired.filter(hab => 
        normalizedUser.some(uh => uh.includes(hab) || hab.includes(uh))
    );
    return Math.round((matches.length / normalizedRequired.length) * 100);
}
