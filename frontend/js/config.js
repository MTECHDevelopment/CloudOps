/**
 * CloudOps - Configuração do Frontend
 * Conecta com a função Lambda: ProjetoIngestao (us-west-1)
 */

const CONFIG = {
    // Ambiente atual
    environment: 'prod',
    
    // Região AWS
    region: 'us-west-1',
    
    // Nome da função Lambda
    lambdaFunction: 'ProjetoIngestao',
    
    // URL da API Gateway - INSIRA A URL DO SEU API GATEWAY AQUI
    // Formato: https://XXXXXXXXXX.execute-api.us-west-1.amazonaws.com/prod
    apiUrl: '',
    
    // Configuração do Cognito (se usar autenticação)
    cognito: {
        userPoolId: '',
        clientId: '',
        region: 'us-west-1'
    },
    
    // Configurações de UI
    ui: {
        // Quantidade de cards no matching
        matchCardsPerPage: 10,
        
        // Debounce para buscas (ms)
        searchDebounce: 300,
        
        // Timeout para notificações (ms)
        notificationTimeout: 5000
    },
    
    // Mapeamento de áreas de pesquisa
    areasDisponiveis: [
        'Ciência da Computação',
        'Inteligência Artificial',
        'Machine Learning',
        'Redes de Computadores',
        'Segurança da Informação',
        'Desenvolvimento Web',
        'Desenvolvimento Mobile',
        'Banco de Dados',
        'Cloud Computing',
        'Internet das Coisas (IoT)',
        'Ciência de Dados',
        'Engenharia de Software',
        'Sistemas Distribuídos',
        'Computação Gráfica',
        'Processamento de Imagens',
        'Robótica',
        'Automação',
        'Bioinformática',
        'Computação Quântica',
        'Blockchain'
    ],
    
    // Níveis de escolaridade
    niveisEscolaridade: [
        { value: 'ensino-medio', label: 'Ensino Médio' },
        { value: 'superior-incompleto', label: 'Superior Incompleto' },
        { value: 'superior-completo', label: 'Superior Completo' },
        { value: 'pos-graduacao', label: 'Pós-Graduação' },
        { value: 'mestrado', label: 'Mestrado' },
        { value: 'doutorado', label: 'Doutorado' },
        { value: 'pos-doutorado', label: 'Pós-Doutorado' }
    ],
    
    // Idiomas disponíveis
    idiomas: [
        'Português',
        'Inglês',
        'Espanhol',
        'Francês',
        'Alemão',
        'Italiano',
        'Mandarim',
        'Japonês',
        'Coreano',
        'Russo',
        'Árabe'
    ],
    
    // Habilidades técnicas comuns
    habilidadesTecnicas: [
        'Python',
        'JavaScript',
        'TypeScript',
        'Java',
        'C++',
        'C#',
        'Go',
        'Rust',
        'SQL',
        'NoSQL',
        'React',
        'Vue.js',
        'Angular',
        'Node.js',
        'Docker',
        'Kubernetes',
        'AWS',
        'Azure',
        'GCP',
        'TensorFlow',
        'PyTorch',
        'Scikit-learn',
        'Pandas',
        'NumPy',
        'Git',
        'Linux',
        'REST APIs',
        'GraphQL',
        'Microservices',
        'CI/CD'
    ]
};

// Tornar disponível globalmente
window.CONFIG = CONFIG;

// Export para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
