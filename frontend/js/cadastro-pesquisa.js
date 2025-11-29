// Cadastro de Pesquisa JS
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pesquisaForm');
    
    // Atualizar header se logado
    updateNavButtons();
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validação
        const errors = validateForm();
        if (errors.length > 0) {
            showErrors(errors);
            return;
        }
        
        const formData = new FormData(form);
        const data = {
            titulo: formData.get('titulo'),
            descricao: formData.get('descricao'),
            dataInicio: formData.get('dataInicio'),
            duracao: formData.get('duracao'),
            areas: formData.getAll('areas'),
            escolaridadeMinima: formData.get('escolaridadeMinima'),
            historicoPublicacao: formData.get('historicoPublicacao'),
            idiomas: formData.getAll('idiomas'),
            habilidadesTecnicas: formData.get('habilidadesTecnicas')?.split(',').map(h => h.trim()).filter(h => h),
            instituicao: formData.get('instituicao'),
            minParticipantes: parseInt(formData.get('minParticipantes')) || 1,
            maxParticipantes: parseInt(formData.get('maxParticipantes')) || 5,
            imprescindivel: formData.getAll('imprescindivel'),
            filtrosAdicionais: {
                localizacao: formData.get('localizacao'),
                nacionalidade: formData.get('nacionalidade'),
                experienciaMinima: parseInt(formData.get('experienciaMinima')) || 0,
                disponibilidade: formData.get('disponibilidade')
            }
        };
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
        
        try {
            // Em produção: await api.createPesquisa(data);
            console.log('Dados da pesquisa:', data);
            
            // Simular delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            document.getElementById('successModal').classList.add('active');
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            alert('Erro ao cadastrar pesquisa. Tente novamente.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Cadastrar Pesquisa';
        }
    });
    
    function validateForm() {
        const errors = [];
        const formData = new FormData(form);
        
        if (!formData.get('titulo')?.trim()) {
            errors.push('Título é obrigatório');
        }
        if (!formData.get('descricao')?.trim()) {
            errors.push('Descrição é obrigatória');
        }
        if (formData.getAll('areas').length === 0) {
            errors.push('Selecione pelo menos uma área de conhecimento');
        }
        
        const min = parseInt(formData.get('minParticipantes')) || 0;
        const max = parseInt(formData.get('maxParticipantes')) || 0;
        if (min > max && max > 0) {
            errors.push('Mínimo de participantes não pode ser maior que o máximo');
        }
        
        return errors;
    }
    
    function showErrors(errors) {
        // Remover alerta anterior se existir
        const existingAlert = document.querySelector('.form-alert');
        if (existingAlert) existingAlert.remove();
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'form-alert error';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>
                <strong>Por favor, corrija os erros:</strong>
                <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
            </div>
            <button type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;
        
        form.insertBefore(alertDiv, form.firstChild);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    function updateNavButtons() {
        const navButtons = document.getElementById('navButtons');
        if (navButtons && window.Auth && Auth.isAuthenticated()) {
            const user = Auth.getCurrentUser();
            navButtons.innerHTML = `
                <span class="user-name">${user?.nome || 'Usuário'}</span>
                <button class="btn btn-outline" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            `;
        }
    }
});

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
    // Redirecionar para minhas pesquisas
    window.location.href = 'minhas-pesquisas.html';
}
