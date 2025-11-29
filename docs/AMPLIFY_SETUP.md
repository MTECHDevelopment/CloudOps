# Configuração do AWS Amplify - CloudOps

Este guia explica como configurar o AWS Amplify para hospedar e gerenciar o projeto CloudOps.

## 📋 Pré-requisitos

1. **Conta AWS** com permissões adequadas
2. **AWS CLI** instalado e configurado
3. **Node.js** 18+ instalado
4. **Git** configurado

## 🚀 Método 1: Amplify Hosting (Console AWS)

### Passo 1: Acessar o Amplify Console

1. Acesse [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Clique em **"Create new app"**

### Passo 2: Conectar Repositório

1. Selecione **GitHub** como provedor
2. Autorize o acesso ao GitHub
3. Selecione o repositório **CloudOps**
4. Escolha a branch **main**

### Passo 3: Configurar Build

O arquivo `amplify.yml` já está configurado na raiz do projeto:

```yaml
version: 1
frontend:
  phases:
    build:
      commands:
        - echo "Build concluído"
  artifacts:
    baseDirectory: frontend
    files:
      - '**/*'
```

### Passo 4: Deploy

1. Clique em **"Save and deploy"**
2. Aguarde o build completar
3. Acesse a URL gerada (ex: `https://main.xxxxxxxxxx.amplifyapp.com`)

---

## 🔧 Método 2: Amplify CLI (Local)

### Passo 1: Instalar Amplify CLI

```powershell
npm install -g @aws-amplify/cli
```

### Passo 2: Configurar Amplify

```powershell
amplify configure
```

Siga as instruções para:
1. Fazer login na AWS
2. Criar um usuário IAM
3. Configurar as credenciais locais

### Passo 3: Inicializar Projeto

```powershell
cd C:\Users\Giz\Documents\GitHub\CloudOps
amplify init
```

Configurações sugeridas:
- **Nome do projeto**: CloudOps
- **Ambiente**: dev
- **Editor**: Visual Studio Code
- **Tipo de app**: javascript
- **Framework**: none
- **Diretório source**: frontend
- **Diretório distribution**: frontend
- **Build command**: (deixar vazio)
- **Start command**: (deixar vazio)

### Passo 4: Adicionar Autenticação (Cognito)

```powershell
amplify add auth
```

Selecione:
- **Default configuration**
- **Username**: Email
- **Advanced Settings**: Adicione atributos personalizados se necessário

### Passo 5: Adicionar API (API Gateway + Lambda)

```powershell
amplify add api
```

Selecione:
- **REST**
- **Nome**: CloudOpsAPI
- **Path**: /api
- **Lambda source**: Create new Lambda function

### Passo 6: Deploy

```powershell
amplify push
```

---

## 🔐 Configurar Cognito (Autenticação)

### No Console AWS:

1. Acesse **Amazon Cognito**
2. Clique em **Create user pool**
3. Configure:

```
Nome: CloudOps-Users
Sign-in: Email
Verificação: Email
MFA: Opcional
Atributos: name, email, custom:tipoUsuario
```

### Obter IDs:

Após criar, copie:
- **User Pool ID**: `us-east-1_XXXXXXXXX`
- **App Client ID**: `XXXXXXXXXXXXXXXXXXXXXXXXXX`

### Atualizar Configuração:

Edite `frontend/js/amplify-config.js`:

```javascript
Auth: {
    Cognito: {
        userPoolId: 'SEU_USER_POOL_ID',
        userPoolClientId: 'SEU_APP_CLIENT_ID',
        // ...
    }
}
```

---

## 🌐 Configurar API Gateway

### No Console AWS:

1. Acesse **API Gateway**
2. A API já foi criada pelo SAM template
3. Copie a **Invoke URL** do stage `Prod`

### Atualizar Configuração:

Edite `frontend/js/amplify-config.js`:

```javascript
API: {
    REST: {
        CloudOpsAPI: {
            endpoint: 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/Prod',
            region: 'us-east-1'
        }
    }
}
```

---

## 📦 Adicionar Amplify ao Frontend

### Opção 1: CDN (Mais simples)

Adicione no `<head>` das páginas HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/aws-amplify@6/dist/aws-amplify.min.js"></script>
<script src="js/amplify-config.js"></script>
<script src="js/amplify-auth.js"></script>
```

### Opção 2: NPM (Se usar bundler)

```powershell
npm install aws-amplify
```

```javascript
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut } from 'aws-amplify/auth';
```

---

## 🔄 CI/CD Automático

O Amplify Hosting configura automaticamente:

1. **Build automático** em cada push para `main`
2. **Preview branches** para pull requests
3. **Rollback** para versões anteriores

### Variáveis de Ambiente:

No Amplify Console > App Settings > Environment variables:

```
COGNITO_USER_POOL_ID = us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID = XXXXXXXXXXXXXXXXXXXXXXXXXX
API_ENDPOINT = https://xxx.execute-api.us-east-1.amazonaws.com/Prod
```

---

## 🧪 Testar Localmente

### Servir Frontend:

```powershell
cd frontend
npx serve .
```

Acesse: `http://localhost:3000`

### Testar com Amplify Mock (opcional):

```powershell
amplify mock
```

---

## 📊 Monitoramento

### CloudWatch Logs:

- Logs das Lambda functions
- Métricas de API Gateway
- Erros de autenticação

### Amplify Console:

- Status dos builds
- Métricas de acesso
- Logs de deploy

---

## 🛠️ Comandos Úteis

```powershell
# Ver status do Amplify
amplify status

# Atualizar backend
amplify push

# Remover recursos
amplify remove auth

# Publicar apenas frontend
amplify publish

# Gerar código de configuração
amplify pull

# Ver logs
amplify console
```

---

## 📁 Estrutura Final

```
CloudOps/
├── amplify/                    # Configurações Amplify (gerado)
│   ├── backend/
│   └── team-provider-info.json
├── amplify.yml                 # Build specs
├── frontend/
│   ├── js/
│   │   ├── amplify-config.js   # Configuração Amplify
│   │   ├── amplify-auth.js     # Módulo de autenticação
│   │   ├── api.js              # Cliente API
│   │   └── ...
│   └── *.html
├── backend/
│   ├── template.yaml           # SAM template
│   └── lambda/
└── api-routes.json             # Documentação das rotas
```

---

## ⚠️ Checklist Final

- [ ] Amplify CLI instalado
- [ ] Repositório conectado ao Amplify Hosting
- [ ] Cognito User Pool criado
- [ ] IDs atualizados em `amplify-config.js`
- [ ] API Gateway URL configurada
- [ ] Primeiro deploy realizado
- [ ] Teste de login funcionando

---

## 🆘 Solução de Problemas

### Erro: "User Pool does not exist"
→ Verifique o `userPoolId` em `amplify-config.js`

### Erro: "Invalid identity pool configuration"
→ O `identityPoolId` é opcional, pode remover se não usar

### Erro de CORS na API
→ Verifique se o API Gateway tem CORS habilitado

### Build falha no Amplify
→ Verifique os logs no Amplify Console

---

## 📚 Referências

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [Amplify JavaScript Library](https://docs.amplify.aws/lib/q/platform/js/)
- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)
