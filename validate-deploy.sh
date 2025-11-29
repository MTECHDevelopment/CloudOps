#!/bin/bash

# 🚀 Script de Validação Pré-Deploy para AWS Amplify
# Verifica se tudo está pronto para deploy

echo "🔍 Validando projeto CloudOps para deploy no Amplify..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Função para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        ((ERRORS++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "📁 Verificando estrutura de arquivos..."
echo ""

# Verificar se a pasta frontend existe
if [ -d "frontend" ]; then
    check "Pasta frontend/ encontrada"
else
    echo -e "${RED}✗${NC} Pasta frontend/ não encontrada!"
    exit 1
fi

# Verificar arquivos HTML principais
[ -f "frontend/index.html" ] && check "index.html existe" || warn "index.html não encontrado"
[ -f "frontend/login.html" ] && check "login.html existe" || warn "login.html não encontrado"
[ -f "frontend/cadastro-perfil.html" ] && check "cadastro-perfil.html existe" || warn "cadastro-perfil.html não encontrado"

echo ""
echo "🎨 Verificando CSS..."
echo ""

[ -f "frontend/css/styles.css" ] && check "styles.css existe" || warn "styles.css não encontrado"
[ -f "frontend/css/enhancements.css" ] && check "enhancements.css existe" || warn "enhancements.css não encontrado"

echo ""
echo "📜 Verificando JavaScript..."
echo ""

[ -f "frontend/js/app.js" ] && check "app.js existe" || warn "app.js não encontrado"
[ -f "frontend/js/auth.js" ] && check "auth.js existe" || warn "auth.js não encontrado"
[ -f "frontend/js/api.js" ] && check "api.js existe" || warn "api.js não encontrado"
[ -f "frontend/js/config.js" ] && check "config.js existe" || warn "config.js não encontrado"

echo ""
echo "⚙️  Verificando configuração do Amplify..."
echo ""

if [ -f "amplify.yml" ]; then
    check "amplify.yml existe"
    
    # Verificar se baseDirectory está correto
    if grep -q "baseDirectory: frontend" amplify.yml; then
        check "baseDirectory configurado para 'frontend'"
    else
        warn "baseDirectory pode não estar configurado corretamente"
    fi
else
    warn "amplify.yml não encontrado (será criado automaticamente pelo Amplify)"
fi

echo ""
echo "🔗 Verificando links e caminhos..."
echo ""

# Verificar se há caminhos absolutos (começam com /)
ABSOLUTE_PATHS=$(grep -r "src=\"/\|href=\"/" frontend/*.html 2>/dev/null | wc -l)
if [ $ABSOLUTE_PATHS -eq 0 ]; then
    check "Todos os caminhos são relativos"
else
    warn "Encontrados $ABSOLUTE_PATHS caminhos absolutos (podem causar problemas)"
fi

echo ""
echo "📦 Verificando tamanho do projeto..."
echo ""

FRONTEND_SIZE=$(du -sh frontend/ | cut -f1)
info "Tamanho do frontend: $FRONTEND_SIZE"

# Verificar se há arquivos muito grandes
LARGE_FILES=$(find frontend -type f -size +5M 2>/dev/null)
if [ -z "$LARGE_FILES" ]; then
    check "Sem arquivos muito grandes (>5MB)"
else
    warn "Arquivos grandes encontrados (podem aumentar tempo de deploy):"
    echo "$LARGE_FILES"
fi

echo ""
echo "🌐 Verificando URLs externas..."
echo ""

# Verificar se Font Awesome está sendo usado
if grep -q "font-awesome" frontend/*.html 2>/dev/null; then
    check "Font Awesome CDN configurado"
fi

# Verificar se Google Fonts está sendo usado
if grep -q "fonts.googleapis.com" frontend/*.html 2>/dev/null; then
    check "Google Fonts configurado"
fi

echo ""
echo "📝 Verificando sintaxe básica..."
echo ""

# Verificar se todos os HTML têm DOCTYPE
HTML_FILES=$(find frontend -name "*.html" | wc -l)
HTML_WITH_DOCTYPE=$(grep -l "<!DOCTYPE html>" frontend/*.html 2>/dev/null | wc -l)

if [ $HTML_FILES -eq $HTML_WITH_DOCTYPE ]; then
    check "Todos os HTML têm DOCTYPE"
else
    warn "Alguns arquivos HTML podem estar sem DOCTYPE"
fi

echo ""
echo "📊 Checklist de Deploy:"
echo ""

# Checklist interativo
checklist_items=(
    "Código commitado no Git"
    "Repositório empurrado para GitHub/GitLab"
    "Variáveis de ambiente configuradas (se necessário)"
    "Backend API deployado"
    "CORS configurado no API Gateway"
    "Teste local realizado"
)

for item in "${checklist_items[@]}"; do
    info "⬜ $item"
done

echo ""
echo "═══════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 Projeto válido para deploy no Amplify!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. git add ."
    echo "2. git commit -m 'Ready for Amplify deploy'"
    echo "3. git push origin main"
    echo "4. Acesse: https://console.aws.amazon.com/amplify"
    echo "5. Conecte seu repositório e faça deploy!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Encontrados $ERRORS erros${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Encontrados $WARNINGS avisos${NC}"
    fi
    echo ""
    echo "Por favor, corrija os erros antes de fazer deploy."
    exit 1
fi
