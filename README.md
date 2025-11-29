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
│       ├── app.js              # JavaScript principal
│       ├── cadastro-perfil.js  # Lógica do cadastro de perfil
│       ├── cadastro-pesquisa.js# Lógica do cadastro de pesquisa
│       ├── dashboard.js        # Lógica do dashboard
│       └── matches.js          # Lógica dos matches
├── backend/
│   ├── template.yaml           # AWS SAM Template
│   └── lambda/
│       ├── cadastroPerfil.js   # CRUD de perfis
│       ├── cadastroPesquisa.js # CRUD de pesquisas
│       ├── matchingEngine.js   # Algoritmo de matching
│       ├── votacao.js          # Sistema de votação
│       ├── notificacoes.js     # Sistema de notificações
│       └── package.json        # Dependências Node.js
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
cd lambda && npm install && cd ..

# Deploy com SAM
sam build
sam deploy --guided
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

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/perfil` | Criar perfil |
| GET | `/perfil/{userId}` | Buscar perfil |
| POST | `/pesquisa` | Criar pesquisa |
| GET | `/pesquisas` | Listar pesquisas |
| GET | `/matches/{pesquisaId}` | Buscar matches |
| POST | `/votacao` | Registrar voto |
| GET | `/votacao/{pesquisaId}` | Ver votação |
| POST | `/notificacao` | Enviar notificação |

---

**CloudOps** - Conectando pesquisadores, transformando a ciência. 🔬

