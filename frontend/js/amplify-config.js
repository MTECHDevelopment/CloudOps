// Configuração do AWS Amplify para CloudOps
// Este arquivo configura a conexão com os serviços AWS

const amplifyConfig = {
    // Região AWS
    aws_project_region: 'us-east-1', // Altere para sua região

    // Cognito - Autenticação
    Auth: {
        Cognito: {
            // Pool de usuários
            userPoolId: 'us-east-1_XXXXXXXXX', // Substitua pelo seu User Pool ID
            userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // Substitua pelo App Client ID
            
            // Pool de identidades (opcional, para acesso a outros serviços AWS)
            identityPoolId: 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Opcional
            
            // Configurações de login
            loginWith: {
                email: true,
                username: false,
                phone: false
            },
            
            // Atributos de signup
            signUpVerificationMethod: 'code',
            userAttributes: {
                email: { required: true },
                name: { required: true }
            },
            
            // Configurações de senha
            passwordFormat: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialCharacters: false
            }
        }
    },

    // API Gateway
    API: {
        REST: {
            CloudOpsAPI: {
                endpoint: 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/Prod', // Substitua pela URL da sua API
                region: 'us-east-1'
            }
        }
    },

    // Storage (S3) - Para upload de fotos de perfil
    Storage: {
        S3: {
            bucket: 'cloudops-uploads-XXXXXX', // Substitua pelo nome do seu bucket
            region: 'us-east-1'
        }
    }
};

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = amplifyConfig;
}
