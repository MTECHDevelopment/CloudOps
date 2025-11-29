# CloudOps - Conexão e Pesquisa

## 🎯 O Problema
Conseguir uma iniciação científica ou formar um grupo de pesquisa hoje depende muito do "boca a boca". É um processo manual, ineficiente e cheio de barreiras.

## 🚀 A Solução
O **"Tinder da Pesquisa"** - uma plataforma que conecta alunos e professores baseada em dados reais: áreas de interesse, habilidades técnicas e histórico de publicações.

## 📁 Estrutura do Projeto

```
CloudOps/
├── frontend/
│   ├── index.html              # Landing page
│   ├── login.html              # Página de login
│   ├── cadastro-perfil.html    # Cadastro de perfil (multi-step)
│   ├── cadastro-pesquisa.html  # Cadastro de pesquisa
│   ├── dashboard.html          # Dashboard do usuário
│   ├── matches.html            # Página de matches (estilo Tinder)
│   ├── css/
│   │   └── styles.css          # Estilos globais
│   └── js/
│       ├── api.js              # Cliente de API
│       ├── config.js           # Configurações
│       ├── app.js              # JavaScript principal
│       ├── cadastro-perfil.js  # Lógica do cadastro de perfil
│       ├── cadastro-pesquisa.js# Lógica do cadastro de pesquisa
│       ├── dashboard.js        # Lógica do dashboard
│       └── matches.js          # Lógica dos matches
├── backend/
│   ├── template.yaml           # AWS SAM Template
│   ├── samconfig.toml          # Configuração de deploy
│   ├── deploy.sh               # Script de deploy
│   └── lambda/
│       ├── api/                # Handlers da API
│       │   ├── auth.js         # Autenticação Cognito
│       │   ├── perfil.js       # CRUD de perfis
│       │   ├── pesquisa.js     # CRUD de pesquisas
│       │   ├── matching.js     # Algoritmo de matching
│       │   ├── votacao.js      # Sistema de votação
│       │   ├── notificacoes.js # Sistema de notificações
│       │   └── package.json    # Dependências
│       └── [legacy handlers]   # Handlers antigos
└── README.md
```

## ✨ Funcionalidades

### 1. Sistema de Match Inteligente
- Algoritmo que cruza áreas de interesse, habilidades e histórico
- Compatibilidade calculada em porcentagem
- Filtros de imprescindibilidade (requisitos obrigatórios)

### 2. Cadastro de Pesquisa
- Definição de áreas de conhecimento
- Requisitos de escolaridade e publicações
- Número mínimo e máximo de participantes
- Campos imprescindíveis vs desejáveis

### 3. Sistema de Votação
- Quando atinge o número de candidatos, inicia votação
- Fórmula: (M/2) - 1 votos necessários
- Os mais votados formam o grupo automaticamente

### 4. Notificações em Tempo Real
- Alertas de novos matches
- Avisos de votações pendentes
- Notificação de grupo formado

## 🛠️ Tecnologias

### Frontend
- HTML5, CSS3, JavaScript
- Design responsivo
- Interface estilo "swipe/match"

### Backend (AWS)
- **AWS Lambda** - Funções serverless
- **Amazon DynamoDB** - Banco de dados NoSQL
- **Amazon API Gateway** - APIs REST
- **Amazon SNS** - Notificações
- **AWS SAM** - Infrastructure as Code

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- AWS CLI configurado
- AWS SAM CLI instalado

### Frontend (Local)
```bash
cd frontend
# Abra index.html no navegador ou use um servidor local
npx serve .
```

### Backend (Deploy AWS)
```bash
cd backend

# Instalar dependências das Lambdas
cd lambda/api && npm install && cd ../..

# Build e Deploy com SAM
sam build
sam deploy --guided

# Ou use o script de deploy (Linux/Mac)
chmod +x deploy.sh
./deploy.sh dev
```

### Configuração do Frontend após Deploy
Após o deploy, atualize o arquivo `frontend/js/config.js` com os valores retornados:
```javascript
const CONFIG = {
    apiUrl: 'SUA_API_URL',
    cognito: {
        userPoolId: 'SEU_USER_POOL_ID',
        clientId: 'SEU_CLIENT_ID',
        region: 'us-east-1'
    }
};
```

## 📊 Fluxo Principal

1. **Professor cadastra pesquisa** com requisitos
2. **Sistema busca perfis** compatíveis
3. Se muitos resultados → solicita **refinamento**
4. Candidatos recebem **notificação**
5. Candidatos interessados **confirmam participação**
6. Ao atingir mínimo, inicia **votação**
7. **Grupo formado** é notificado ao professor

## 📝 API Endpoints

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Registrar usuário |
| POST | `/auth/confirm` | Confirmar email |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Dados do usuário logado |

### Perfil
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/perfil` | Criar perfil |
| GET | `/perfil/{userId}` | Buscar perfil |
| PUT | `/perfil/{userId}` | Atualizar perfil |
| GET | `/perfil` | Listar perfis |

### Pesquisa
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/pesquisa` | Criar pesquisa |
| GET | `/pesquisa/{pesquisaId}` | Buscar pesquisa |
| PUT | `/pesquisa/{pesquisaId}` | Atualizar pesquisa |
| DELETE | `/pesquisa/{pesquisaId}` | Deletar pesquisa |
| GET | `/pesquisa` | Listar pesquisas |
| POST | `/pesquisa/{id}/candidatar` | Candidatar-se |
| GET | `/pesquisa/{id}/candidatos` | Listar candidatos |

### Matching
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/matches/{pesquisaId}` | Matches para pesquisa |
| GET | `/matches/user/{userId}` | Matches para usuário |
| POST | `/matches/accept` | Aceitar match |
| POST | `/matches/reject` | Rejeitar match |

### Votação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/votacao/iniciar` | Iniciar votação |
| GET | `/votacao/{pesquisaId}` | Status da votação |
| GET | `/votacao/{pid}/candidatos/{uid}` | Candidatos para votar |
| POST | `/votacao/votar` | Registrar voto |
| POST | `/votacao/finalizar` | Finalizar votação |
| GET | `/votacao/{pesquisaId}/resultado` | Resultado |
| POST | `/notificacao` | Enviar notificação |

---

**CloudOps** - Conectando pesquisadores, transformando a ciência. 🔬

