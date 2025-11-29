/**
 * CloudOps - Módulo de Autenticação
 * Gerencia login, logout e proteção de rotas
 */

const AUTH_KEYS = {
    ACCESS_TOKEN: 'cloudops_access_token',
    REFRESH_TOKEN: 'cloudops_refresh_token',
    ID_TOKEN: 'cloudops_id_token',
    USER_DATA: 'cloudops_user_data',
    USER_ID: 'cloudops_user_id'
};

// Páginas públicas que não requerem autenticação
const PUBLIC_PAGES = [
    'index.html',
    'login.html',
    'cadastro-perfil.html'
];

/**
 * Verifica se a página atual é pública
 */
function isPublicPage() {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';
    
    // Verificar se é a raiz ou uma página pública
    return currentPath === '/' || 
           currentPath.endsWith('/') ||
           PUBLIC_PAGES.includes(currentFile);
}

/**
 * Verifica se o usuário está autenticado
 */
function isAuthenticated() {
    const token = localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const userId = localStorage.getItem(AUTH_KEYS.USER_ID);
    return !!(token && userId);
}

/**
 * Obtém o ID do usuário logado
 */
function getCurrentUserId() {
    return localStorage.getItem(AUTH_KEYS.USER_ID);
}

/**
 * Obtém os dados do usuário logado
 */
function getCurrentUser() {
    const userData = localStorage.getItem(AUTH_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
}

/**
 * Obtém o token de acesso
 */
function getAccessToken() {
    return localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
}

/**
 * Salva os dados de autenticação
 */
function saveAuthData(authResponse, userData) {
    if (authResponse.accessToken) {
        localStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, authResponse.accessToken);
    }
    if (authResponse.refreshToken) {
        localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, authResponse.refreshToken);
    }
    if (authResponse.idToken) {
        localStorage.setItem(AUTH_KEYS.ID_TOKEN, authResponse.idToken);
    }
    if (userData) {
        localStorage.setItem(AUTH_KEYS.USER_DATA, JSON.stringify(userData));
        if (userData.userId) {
            localStorage.setItem(AUTH_KEYS.USER_ID, userData.userId);
        }
    }
}

/**
 * Limpa os dados de autenticação
 */
function clearAuthData() {
    Object.values(AUTH_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

/**
 * Realiza logout
 */
function logout() {
    clearAuthData();
    window.location.href = 'login.html';
}

/**
 * Redireciona para login se não autenticado
 */
function requireAuth() {
    // Se for página pública, não precisa verificar
    if (isPublicPage()) {
        return true;
    }

    if (!isAuthenticated()) {
        // Salvar URL de destino para redirecionar após login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Redireciona após login bem-sucedido
 */
function redirectAfterLogin() {
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    
    if (redirectUrl && !redirectUrl.includes('login.html')) {
        window.location.href = redirectUrl;
    } else {
        window.location.href = 'perfil.html';
    }
}

/**
 * Atualiza elementos do header com dados do usuário
 */
function updateHeaderUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    const headerUserName = document.getElementById('headerUserName');
    const headerAvatar = document.getElementById('headerAvatar');
    
    if (headerUserName) {
        headerUserName.textContent = user.nome || user.email || 'Usuário';
    }
    
    if (headerAvatar && user.foto) {
        headerAvatar.src = user.foto;
        headerAvatar.style.display = 'block';
    }
}

/**
 * Inicializa o módulo de autenticação
 */
function initAuth() {
    // Verificar autenticação em páginas protegidas
    if (!requireAuth()) {
        return false;
    }

    // Atualizar header se autenticado
    if (isAuthenticated()) {
        updateHeaderUserInfo();
    }

    return true;
}

// Auto-inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initAuth);

// Exportar para uso global
window.Auth = {
    isAuthenticated,
    getCurrentUserId,
    getCurrentUser,
    getAccessToken,
    saveAuthData,
    clearAuthData,
    logout,
    requireAuth,
    redirectAfterLogin,
    updateHeaderUserInfo
};
