# 🚀 Deploy no AWS Amplify - Frontend Estático

## ✅ Sim! Funciona Perfeitamente Sem Framework

O AWS Amplify suporta **100% sites estáticos** (HTML/CSS/JS) sem necessidade de frameworks como React, Vue, etc.

---

## 📋 Pré-requisitos

1. ✅ Conta AWS ativa
2. ✅ Repositório GitHub/GitLab/Bitbucket (já tem!)
3. ✅ Código já está pronto (HTML/CSS/JS puro)

---

## 🎯 Métodos de Deploy

### **Método 1: Via Console AWS (Recomendado - Mais Fácil)**

#### Passo 1: Acessar o Amplify
1. Entre no [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Clique em **"New app" → "Host web app"**

#### Passo 2: Conectar Repositório
1. Escolha seu provedor: **GitHub** (MTECH-ops/CloudOps)
2. Autorize o AWS Amplify a acessar seu repositório
3. Selecione o repositório: **CloudOps**
4. Selecione a branch: **main**

#### Passo 3: Configurar Build
O Amplify vai detectar automaticamente o `amplify.yml`

**Configurações que serão aplicadas:**
```yaml
Build command: Nenhum (estático)
Base directory: frontend
Output directory: frontend
```

#### Passo 4: Configurações Avançadas (Opcional)
```
App name: cloudops-frontend
Environment: production
```

#### Passo 5: Deploy
1. Clique em **"Save and deploy"**
2. Aguarde o deploy (1-3 minutos)
3. ✅ Seu site estará online em: `https://main.xxxxxx.amplifyapp.com`

---

### **Método 2: Via AWS CLI**

```bash
# 1. Instalar AWS CLI
npm install -g @aws-amplify/cli

# 2. Configurar credenciais
amplify configure

# 3. Inicializar projeto
amplify init
# Escolha:
# - Environment: production
# - Editor: VS Code
# - Distribution Directory: frontend

# 4. Adicionar hosting
amplify add hosting
# Escolha: Hosting with Amplify Console

# 5. Deploy
amplify publish
```

---

### **Método 3: Deploy Manual (Drag & Drop)**

1. Compacte a pasta `frontend` em ZIP
2. Acesse [Amplify Console](https://console.aws.amazon.com/amplify)
3. Clique em **"Deploy without Git provider"**
4. Arraste o ZIP ou selecione manualmente
5. ✅ Deploy instantâneo!

---

## 🎨 Estrutura do Projeto (Frontend Estático)

```
frontend/
├── index.html              # Página principal
├── login.html             # Login
├── cadastro-perfil.html   # Cadastro
├── cadastro-pesquisa.html
├── matches.html
├── perfil.html
├── css/
│   ├── styles.css         # CSS principal
│   └── enhancements.css   # Melhorias
└── js/
    ├── app.js            # JavaScript principal
    ├── auth.js           # Autenticação
    ├── cadastro-perfil.js
    ├── config.js
    └── api.js
```

**✅ Não precisa de:**
- ❌ Node.js
- ❌ npm install
- ❌ Build process
- ❌ Webpack/Vite
- ❌ React/Vue/Angular

---

## ⚙️ Configuração do amplify.yml

O arquivo `amplify.yml` já está configurado:

```yaml
frontend:
  phases:
    build:
      commands:
        - echo "Frontend estático - sem build"
  artifacts:
    baseDirectory: frontend
    files:
      - '**/*'
```

**Isso significa:**
- 📁 Todos os arquivos de `frontend/` serão servidos
- 🚀 Deploy direto, sem compilação
- ⚡ Super rápido (< 1 minuto)

---

## 🌐 Configurações de Domínio

### Domínio Padrão
Após deploy, você recebe:
```
https://main.d1a2b3c4d5e6f7.amplifyapp.com
```

### Domínio Personalizado
1. No Amplify Console → **Domain Management**
2. Clique em **"Add domain"**
3. Configure seu domínio (ex: `cloudops.com`)
4. Amplify gera certificado SSL automaticamente
5. Configure DNS conforme instruções

---

## 🔧 Variáveis de Ambiente

Para configurar endpoints da API:

### No Console
1. Amplify Console → **Environment variables**
2. Adicione:
```
API_URL=https://seu-api-gateway.amazonaws.com
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
```

### No Código
Crie `frontend/js/env.js`:
```javascript
window.ENV = {
  API_URL: 'https://api.cloudops.com',
  COGNITO_USER_POOL_ID: 'us-east-1_xxxxx'
};
```

E referencie no HTML:
```html
<script src="js/env.js"></script>
```

---

## 🚦 Rewrites e Redirects

Para SPA behavior (todas rotas → index.html):

No Amplify Console → **Rewrites and redirects**:

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "404-200",
    "condition": null
  }
]
```

**Para este projeto não é necessário** (não é SPA).

---

## 📊 Monitoramento

O Amplify fornece automaticamente:
- ✅ **Analytics**: Visitantes, páginas vistas
- ✅ **Logs**: Build logs, deploy logs
- ✅ **Alerts**: Notificações de deploy
- ✅ **Preview**: Preview de PRs antes de merge

---

## 🔄 CI/CD Automático

Com repositório conectado:

1. **Push to main** → Deploy automático
2. **Pull Request** → Deploy preview
3. **Branch feature** → Deploy de teste

### Configurar Auto-Deploy
Já está configurado no `amplify.yml`!

Cada push no GitHub dispara:
```
1. Checkout code
2. Run build commands (nenhum neste caso)
3. Deploy frontend
4. Invalidate CDN cache
5. ✅ Live!
```

---

## 💰 Custos

### Free Tier (Primeiro ano)
- ✅ 1000 build minutes/mês
- ✅ 15 GB de dados transferidos/mês
- ✅ 5 GB de armazenamento

### Após Free Tier
- Build: $0.01/minuto
- Hosting: $0.15/GB transferido
- Storage: $0.023/GB/mês

**Estimativa para este projeto:**
- ~$2-5/mês (baixo tráfego)
- ~$10-20/mês (tráfego médio)

---

## 🎯 Vantagens do Amplify para Sites Estáticos

✅ **CDN Global** - CloudFront integrado  
✅ **SSL Gratuito** - Certificado gerenciado  
✅ **Deploy Rápido** - < 1 minuto  
✅ **Git Integration** - CI/CD automático  
✅ **Preview Branches** - Teste antes de produção  
✅ **Custom Domains** - Múltiplos domínios  
✅ **Analytics** - Métricas integradas  
✅ **Redirects** - Configuração fácil  
✅ **Headers** - Cache control, CORS, etc.  
✅ **Rollback** - Voltar versões anteriores  

---

## 🐛 Troubleshooting

### Build Falhou
```bash
# Verifique os logs no Amplify Console
# Geralmente é:
- Problema no amplify.yml
- Permissões AWS
```

### 404 em Arquivos
```bash
# Verifique se os caminhos estão corretos
# HTML: href="css/styles.css" (não /css/styles.css)
```

### API não conecta
```bash
# Configure CORS no API Gateway
# Adicione variáveis de ambiente
```

---

## 📝 Checklist de Deploy

- [ ] Código no GitHub/GitLab
- [ ] `amplify.yml` configurado
- [ ] Caminhos relativos nos HTMLs
- [ ] Variáveis de ambiente definidas
- [ ] Backend deployado (SAM/Lambda)
- [ ] CORS configurado na API
- [ ] Teste local funcionando

---

## 🚀 Deploy Agora!

### Opção Rápida (5 minutos)
```bash
# 1. Push para GitHub (se ainda não fez)
git add .
git commit -m "Deploy to Amplify"
git push origin main

# 2. Acesse Amplify Console
# 3. Conecte o repo
# 4. ✅ Deploy!
```

### Opção Manual (2 minutos)
```bash
# 1. Compacte frontend/
cd /home/carlos/projetos/CloudOps
zip -r frontend.zip frontend/

# 2. Amplify Console → Manual Deploy
# 3. Upload frontend.zip
# 4. ✅ Live!
```

---

## 📞 Recursos

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [Amplify Console](https://console.aws.amazon.com/amplify)
- [Pricing Calculator](https://calculator.aws/)

---

## ✨ Resultado Final

Após o deploy, você terá:

```
🌐 URL: https://main.xxxxxx.amplifyapp.com
📊 Analytics automático
🔒 HTTPS automático
🚀 CDN global
⚡ Deploy em < 1 minuto
🔄 CI/CD automático
```

**Seu frontend estará:**
- ✅ Online
- ✅ Rápido (CDN)
- ✅ Seguro (SSL)
- ✅ Escalável
- ✅ Profissional

---

**Pronto para deploy!** 🚀
