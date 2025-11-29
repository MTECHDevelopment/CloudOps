/**
 * CloudOps - API Client
 * Cliente para integração com o backend AWS
 */

const API_BASE_URL = window.CONFIG?.apiUrl || 'http://localhost:3000';

class CloudOpsAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = localStorage.getItem('accessToken');
    }

    // Headers padrão
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Método genérico para requisições
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ==================
    // AUTH
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
            this.token = response.accessToken;
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('idToken', response.idToken);
        }

        return response;
    }

    async getMe() {
        return await this.request('/auth/me');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    }

    // ==================
    // PERFIL
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
        return await this.request(`/perfil${query}`);
    }

    // ==================
    // PESQUISA
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
        return await this.request(`/pesquisa${query}`);
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
    // MATCHING
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
    // VOTAÇÃO
    // ==================

    async iniciarVotacao(pesquisaId, candidatos) {
        return await this.request('/votacao/iniciar', {
            method: 'POST',
            body: JSON.stringify({ pesquisaId, candidatos })
        });
    }

    async getVotacaoStatus(pesquisaId) {
        return await this.request(`/votacao/${pesquisaId}`);
    }

    async getCandidatosParaVotar(pesquisaId, userId) {
        return await this.request(`/votacao/${pesquisaId}/candidatos/${userId}`);
    }

    async votar(votoData) {
        return await this.request('/votacao/votar', {
            method: 'POST',
            body: JSON.stringify(votoData)
        });
    }

    async finalizarVotacao(pesquisaId) {
        return await this.request('/votacao/finalizar', {
            method: 'POST',
            body: JSON.stringify({ pesquisaId })
        });
    }

    async getResultadoVotacao(pesquisaId) {
        return await this.request(`/votacao/${pesquisaId}/resultado`);
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

// Instância global
const api = new CloudOpsAPI();

// A verificação de autenticação é feita pelo módulo auth.js
// Não duplicar aqui para evitar conflitos de redirecionamento

// Export para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CloudOpsAPI, api };
}
