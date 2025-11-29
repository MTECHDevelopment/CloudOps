/**
 * CloudOps - API Client
 * Cliente para integração com o backend AWS (API Gateway + Lambda)
 */

class CloudOpsAPI {
    constructor() {
        this.baseUrl = window.CONFIG?.apiUrl || '';
        this.token = localStorage.getItem('cloudops_access_token');
    }

    // Headers padrão para requisições
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Atualiza o token (usado após login)
    setToken(token) {
        this.token = token;
    }

    // Método genérico para requisições à API
    async request(endpoint, options = {}) {
        if (!this.baseUrl) {
            throw new Error('API URL não configurada. Atualize o config.js com a URL da API Gateway.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        // Remover headers duplicados se options já tiver
        if (options.headers) {
            config.headers = { ...config.headers, ...options.headers };
        }

        try {
            console.log(`[API] ${config.method} ${endpoint}`);
            const response = await fetch(url, config);
            
            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = typeof data === 'object' ? data.error || data.message : data;
                throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    }

    // ==================
    // AUTH - Autenticação
    // ==================
    
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            auth: false
        });
        return response;
    }

    async confirmEmail(email, code) {
        const response = await this.request('/auth/confirm', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
            auth: false
        });
        return response;
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            auth: false
        });

        if (response.accessToken) {
            this.setToken(response.accessToken);
            localStorage.setItem('cloudops_access_token', response.accessToken);
            if (response.refreshToken) {
                localStorage.setItem('cloudops_refresh_token', response.refreshToken);
            }
            if (response.idToken) {
                localStorage.setItem('cloudops_id_token', response.idToken);
            }
            if (response.userId) {
                localStorage.setItem('cloudops_user_id', response.userId);
            }
        }

        return response;
    }

    async getMe() {
        return await this.request('/auth/me');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('cloudops_access_token');
        localStorage.removeItem('cloudops_refresh_token');
        localStorage.removeItem('cloudops_id_token');
        localStorage.removeItem('cloudops_user_id');
        localStorage.removeItem('cloudops_user_data');
        window.location.href = 'login.html';
    }

    // ==================
    // PERFIL - Gerenciamento de Perfis
    // ==================

    async createPerfil(perfilData) {
        return await this.request('/perfil', {
            method: 'POST',
            body: JSON.stringify(perfilData)
        });
    }

    async getPerfil(userId) {
        return await this.request(`/perfil/${userId}`);
    }

    async updatePerfil(userId, perfilData) {
        return await this.request(`/perfil/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(perfilData)
        });
    }

    async listPerfis(tipo) {
        const query = tipo ? `?tipo=${tipo}` : '';
        return await this.request(`/perfis${query}`);
    }

    // ==================
    // PESQUISA - Gerenciamento de Pesquisas
    // ==================

    async createPesquisa(pesquisaData) {
        return await this.request('/pesquisa', {
            method: 'POST',
            body: JSON.stringify(pesquisaData)
        });
    }

    async getPesquisa(pesquisaId) {
        return await this.request(`/pesquisa/${pesquisaId}`);
    }

    async listPesquisas(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const query = params ? `?${params}` : '';
        return await this.request(`/pesquisas${query}`);
    }

    async updatePesquisa(pesquisaId, pesquisaData) {
        return await this.request(`/pesquisa/${pesquisaId}`, {
            method: 'PUT',
            body: JSON.stringify(pesquisaData)
        });
    }

    async deletePesquisa(pesquisaId) {
        return await this.request(`/pesquisa/${pesquisaId}`, {
            method: 'DELETE'
        });
    }

    async candidatarPesquisa(pesquisaId, candidatoId) {
        return await this.request(`/pesquisa/${pesquisaId}/candidatar`, {
            method: 'POST',
            body: JSON.stringify({ candidatoId })
        });
    }

    async getCandidatos(pesquisaId) {
        return await this.request(`/pesquisa/${pesquisaId}/candidatos`);
    }

    // ==================
    // MATCHING - Sistema de Match
    // ==================

    async findMatchesForPesquisa(pesquisaId) {
        return await this.request(`/matches/${pesquisaId}`);
    }

    async findMatchesForUser(userId) {
        return await this.request(`/matches/user/${userId}`);
    }

    async acceptMatch(matchData) {
        return await this.request('/matches/accept', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    async rejectMatch(matchData) {
        return await this.request('/matches/reject', {
            method: 'POST',
            body: JSON.stringify(matchData)
        });
    }

    // ==================
    // NOTIFICAÇÕES
    // ==================

    async getNotificacoes(userId) {
        return await this.request(`/notificacoes?userId=${userId}`);
    }

    async sendNotificacao(notificacaoData) {
        return await this.request('/notificacao', {
            method: 'POST',
            body: JSON.stringify(notificacaoData)
        });
    }

    // ==================
    // DASHBOARD / STATS
    // ==================

    async getDashboardStats(userId) {
        const [perfil, minhasPesquisas, meusMatches] = await Promise.all([
            this.getPerfil(userId).catch(() => null),
            this.listPesquisas({ professorId: userId }).catch(() => ({ pesquisas: [] })),
            this.findMatchesForUser(userId).catch(() => ({ matches: [] }))
        ]);

        return {
            perfil,
            pesquisas: minhasPesquisas.pesquisas || [],
            matches: meusMatches.matches || [],
            stats: {
                totalPesquisas: (minhasPesquisas.pesquisas || []).length,
                totalMatches: (meusMatches.matches || []).length,
                matchesAtivos: (meusMatches.matches || []).filter(m => m.status === 'aceito').length
            }
        };
    }
}

// Instância global da API
const api = new CloudOpsAPI();

// Export para uso em módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CloudOpsAPI, api };
}
