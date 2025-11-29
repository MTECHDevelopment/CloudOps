/**
 * CloudOps - Página de Perfil
 * Gerencia a exibição e edição do perfil do usuário
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    if (!Auth.isAuthenticated()) {
        return;
    }

    await loadProfile();
    await loadStats();
    await loadMatchesPanel();
    setupEventListeners();
});

/**
 * Carrega os dados do perfil
 */
async function loadProfile() {
    try {
        const userId = Auth.getCurrentUserId();
        const response = await api.getPerfil(userId);
        
        if (response) {
            renderProfile(response);
            // Atualizar dados no localStorage
            Auth.saveAuthData({}, response);
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        showNotification('Erro ao carregar perfil', 'error');
    }
}

/**
 * Renderiza os dados do perfil na página
 */
function renderProfile(user) {
    // Header
    document.getElementById('profileName').textContent = user.nome || 'Sem nome';
    document.getElementById('profileType').textContent = formatUserType(user.tipoUsuario);
    document.getElementById('profileInstitution').textContent = user.instituicao || '-';
    document.getElementById('profileBio').textContent = user.bio || 'Nenhuma biografia adicionada.';
    
    // Avatar
    if (user.foto) {
        const avatar = document.getElementById('profileAvatar');
        avatar.src = user.foto;
        avatar.style.display = 'block';
    }

    // Detalhes
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('profileTelefone').textContent = user.telefone || '-';
    document.getElementById('profileInstituicaoDetail').textContent = user.instituicao || '-';
    document.getElementById('profileEscolaridade').textContent = formatEscolaridade(user.escolaridade);
    
    const lattesLink = document.getElementById('profileLattes');
    if (user.lattes) {
        lattesLink.href = user.lattes;
        lattesLink.textContent = 'Ver Lattes';
    } else {
        lattesLink.textContent = 'Não informado';
        lattesLink.removeAttribute('href');
    }

    // Áreas de interesse
    renderTags('profileAreas', user.areasInteresse);
    
    // Habilidades
    renderTags('profileHabilidades', user.habilidades);
    
    // Idiomas
    renderTags('profileIdiomas', user.idiomas);

    // Experiência
    renderExperiencia(user.experiencia);

    // Atualizar header
    document.getElementById('headerUserName').textContent = user.nome || user.email;
}

/**
 * Renderiza tags em um container
 */
function renderTags(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<span class="empty-message">Nenhum item cadastrado.</span>';
        return;
    }

    container.innerHTML = items.map(item => 
        `<span class="tag">${item}</span>`
    ).join('');
}

/**
 * Renderiza lista de experiências
 */
function renderExperiencia(experiencias) {
    const container = document.getElementById('profileExperiencia');
    if (!container) return;

    if (!experiencias || experiencias.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma experiência cadastrada.</p>';
        return;
    }

    container.innerHTML = experiencias.map(exp => `
        <div class="experience-item">
            <div class="experience-header">
                <h4>${exp.cargo || exp.titulo}</h4>
                <span class="experience-period">${exp.periodo || ''}</span>
            </div>
            <p class="experience-company">${exp.empresa || exp.instituicao || ''}</p>
            <p class="experience-description">${exp.descricao || ''}</p>
        </div>
    `).join('');
}

/**
 * Carrega estatísticas do perfil
 */
async function loadStats() {
    try {
        const userId = Auth.getCurrentUserId();
        const stats = await api.getDashboardStats(userId);

        document.getElementById('statMatches').textContent = stats.stats?.totalMatches || 0;
        document.getElementById('statPesquisas').textContent = stats.stats?.totalPesquisas || 0;
        document.getElementById('statPublicacoes').textContent = stats.perfil?.numPublicacoes || 0;
        document.getElementById('statGrupos').textContent = stats.stats?.matchesAtivos || 0;

        // Badges de notificação
        const notifBadge = document.getElementById('notifBadge');
        const headerNotifCount = document.getElementById('headerNotifCount');
        const matchesBadge = document.getElementById('matchesBadge');

        if (notifBadge) notifBadge.textContent = '0'; // Carregar do backend
        if (headerNotifCount) headerNotifCount.textContent = '0';
        if (matchesBadge) matchesBadge.textContent = stats.stats?.totalMatches || 0;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
    // Form de edição
    const editForm = document.getElementById('editProfileForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // Toggle sidebar
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
    }
}

/**
 * Abre modal de edição de perfil
 */
async function editProfile() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Preencher formulário
    document.getElementById('editNome').value = user.nome || '';
    document.getElementById('editTelefone').value = user.telefone || '';
    document.getElementById('editInstituicao').value = user.instituicao || '';
    document.getElementById('editEscolaridade').value = user.escolaridade || '';
    document.getElementById('editBio').value = user.bio || '';
    document.getElementById('editLattes').value = user.lattes || '';
    document.getElementById('editPublicacoes').value = user.numPublicacoes || 0;

    openModal('editProfileModal');
}

/**
 * Processa submissão do formulário de edição
 */
async function handleEditSubmit(e) {
    e.preventDefault();

    const userId = Auth.getCurrentUserId();
    const formData = {
        nome: document.getElementById('editNome').value,
        telefone: document.getElementById('editTelefone').value,
        instituicao: document.getElementById('editInstituicao').value,
        escolaridade: document.getElementById('editEscolaridade').value,
        bio: document.getElementById('editBio').value,
        lattes: document.getElementById('editLattes').value,
        numPublicacoes: parseInt(document.getElementById('editPublicacoes').value) || 0
    };

    try {
        const response = await api.updatePerfil(userId, formData);
        
        // Atualizar dados locais
        const currentUser = Auth.getCurrentUser();
        Auth.saveAuthData({}, { ...currentUser, ...formData });

        closeModal('editProfileModal');
        showNotification('Perfil atualizado com sucesso!', 'success');
        
        // Recarregar dados
        await loadProfile();

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showNotification('Erro ao atualizar perfil', 'error');
    }
}

/**
 * Edita avatar (placeholder para upload)
 */
function editAvatar() {
    // Criar input file invisível
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // TODO: Implementar upload para S3
            showNotification('Upload de avatar em desenvolvimento', 'info');
        }
    };
    input.click();
}

/**
 * Formata tipo de usuário
 */
function formatUserType(tipo) {
    const tipos = {
        'aluno': 'Aluno',
        'professor': 'Professor',
        'pesquisador': 'Pesquisador'
    };
    return tipos[tipo] || tipo || '-';
}

/**
 * Formata nível de escolaridade
 */
function formatEscolaridade(escolaridade) {
    const niveis = {
        'ensino-medio': 'Ensino Médio',
        'superior-incompleto': 'Superior Incompleto',
        'superior-completo': 'Superior Completo',
        'pos-graduacao': 'Pós-Graduação',
        'mestrado': 'Mestrado',
        'doutorado': 'Doutorado',
        'pos-doutorado': 'Pós-Doutorado'
    };
    return niveis[escolaridade] || escolaridade || '-';
}

/**
 * Abre modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

/**
 * Fecha modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

/**
 * Exibe notificação
 */
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 10);

    // Remover após timeout
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Carrega matches recentes para o painel direito
 */
async function loadMatchesPanel() {
    const container = document.getElementById('matchesPanelList');
    if (!container) return;

    try {
        const userId = Auth.getCurrentUserId();
        
        // Em produção, usar a API
        // const response = await api.getMatches(userId);
        // const matches = response.matches || [];

        // Mock data para demonstração
        const matches = [
            { 
                id: 'pesq-001', 
                professorId: 'prof-001',
                professorNome: 'Dr. Carlos Alberto', 
                titulo: 'IA Aplicada à Medicina', 
                score: 95 
            },
            { 
                id: 'pesq-002', 
                professorId: 'prof-002',
                professorNome: 'Dra. Ana Paula', 
                titulo: 'Segurança em IoT', 
                score: 87 
            },
            { 
                id: 'pesq-003', 
                professorId: 'prof-003',
                professorNome: 'Dr. Ricardo Santos', 
                titulo: 'Big Data Analytics', 
                score: 78 
            },
            { 
                id: 'pesq-004', 
                professorId: 'prof-004',
                professorNome: 'Dra. Fernanda Lima', 
                titulo: 'Robótica Assistiva', 
                score: 65 
            }
        ];

        renderMatchesPanel(matches);

    } catch (error) {
        console.error('Erro ao carregar matches:', error);
        container.innerHTML = `
            <div class="matches-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar matches</p>
            </div>
        `;
    }
}

/**
 * Renderiza os matches no painel direito
 */
function renderMatchesPanel(matches) {
    const container = document.getElementById('matchesPanelList');
    if (!container) return;

    if (!matches || matches.length === 0) {
        container.innerHTML = `
            <div class="matches-empty">
                <i class="fas fa-heart-broken"></i>
                <p>Nenhum match ainda.<br>Explore oportunidades!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = matches.map(match => {
        const initials = match.professorNome.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        let scoreClass = '';
        if (match.score >= 80) {
            scoreClass = '';
        } else if (match.score >= 60) {
            scoreClass = 'medium';
        } else {
            scoreClass = 'low';
        }
        
        return `
            <a href="pesquisa.html?id=${match.id}" class="match-card">
                <div class="match-avatar">${initials}</div>
                <div class="match-info">
                    <div class="match-name">${match.professorNome}</div>
                    <div class="match-research">${match.titulo}</div>
                </div>
                <span class="match-score ${scoreClass}">${match.score}%</span>
            </a>
        `;
    }).join('');
}
