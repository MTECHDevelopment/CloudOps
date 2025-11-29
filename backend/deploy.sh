#!/bin/bash
# CloudOps - Script de Deploy

set -e

echo "🚀 CloudOps - Deploy Script"
echo "================================"

# Verificar se AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI não encontrado. Instale: https://aws.amazon.com/cli/"
    exit 1
fi

# Verificar se SAM CLI está instalado
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI não encontrado. Instale: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Parâmetros
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "📦 Ambiente: $ENVIRONMENT"
echo "🌎 Região: $REGION"
echo ""

# Navegar para o diretório do backend
cd "$(dirname "$0")"

# Instalar dependências das Lambdas
echo "📥 Instalando dependências..."
cd lambda
npm install
cd ..

# Build com SAM
echo "🔨 Construindo aplicação..."
sam build

# Deploy
echo "🚀 Fazendo deploy..."
if [ "$ENVIRONMENT" == "prod" ]; then
    sam deploy --config-env prod --no-confirm-changeset
else
    sam deploy --no-confirm-changeset
fi

# Obter outputs
echo ""
echo "✅ Deploy concluído!"
echo "================================"

STACK_NAME="cloudops-$ENVIRONMENT"
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text --region $REGION)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text --region $REGION)
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --region $REGION)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text --region $REGION)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text --region $REGION)

echo ""
echo "📋 Informações do Deploy:"
echo "   API URL: $API_URL"
echo "   CloudFront URL: $CLOUDFRONT_URL"
echo "   Frontend Bucket: $FRONTEND_BUCKET"
echo "   User Pool ID: $USER_POOL_ID"
echo "   User Pool Client ID: $USER_POOL_CLIENT_ID"

# Criar arquivo de configuração para o frontend
echo ""
echo "📝 Gerando configuração do frontend..."
cat > ../frontend/js/config.js << EOF
// CloudOps - Configuração (gerado automaticamente)
const CONFIG = {
    API_URL: '$API_URL',
    USER_POOL_ID: '$USER_POOL_ID',
    USER_POOL_CLIENT_ID: '$USER_POOL_CLIENT_ID',
    REGION: '$REGION',
    ENVIRONMENT: '$ENVIRONMENT'
};

// Não modificar manualmente - gerado pelo deploy.sh
EOF

echo "✅ Configuração salva em frontend/js/config.js"

# Perguntar se deseja fazer deploy do frontend
echo ""
read -p "🌐 Deseja fazer deploy do frontend? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Fazendo upload do frontend para S3..."
    aws s3 sync ../frontend s3://$FRONTEND_BUCKET --delete --region $REGION
    echo "✅ Frontend deployado!"
    echo ""
    echo "🌐 Acesse sua aplicação em:"
    echo "   $CLOUDFRONT_URL"
fi

echo ""
echo "🎉 Tudo pronto!"
