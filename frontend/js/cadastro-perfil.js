// Cadastro de Perfil JS - Multi-step form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('perfilForm');
    if (!form) {
        console.error('Formulário não encontrado!');
        return;
    }
    
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-steps .step');
    const prevBtn = document.querySelector('.prev-step');
    const nextBtn = document.querySelector('.next-step');
    const submitBtn = document.querySelector('.submit-btn');
    let currentStep = 1;

    function showStep(step) {
        steps.forEach(s => s.classList.remove('active'));
        progressSteps.forEach(s => s.classList.remove('active'));
        
        const currentFormStep = document.querySelector(`.form-step[data-step="${step}"]`);
        if (currentFormStep) {
            currentFormStep.classList.add('active');
        }
        
        for (let i = 1; i <= step; i++) {
            const progressStep = document.querySelector(`.progress-steps .step[data-step="${i}"]`);
            if (progressStep) {
                progressStep.classList.add('active');
            }
        }
        
        if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'flex';
        if (nextBtn) nextBtn.style.display = step === 3 ? 'none' : 'flex';
        if (submitBtn) submitBtn.style.display = step === 3 ? 'flex' : 'none';
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < 3) {
                currentStep++;
                showStep(currentStep);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    // Skills input
    const skillsInput = document.getElementById('habilidadesInput');
    const skillsContainer = document.getElementById('habilidadesTags');
    const skills = [];

    if (skillsInput) {
        skillsInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const skill = this.value.trim();
                if (skill && !skills.includes(skill)) {
                    skills.push(skill);
                    renderSkills();
                }
                this.value = '';
            }
        });
    }

    document.querySelectorAll('.skill-tag').forEach(btn => {
        btn.addEventListener('click', function() {
            const skill = this.dataset.skill;
            if (!skills.includes(skill)) {
                skills.push(skill);
                renderSkills();
            }
        });
    });

    function renderSkills() {
        skillsContainer.innerHTML = skills.map(s => 
            `<span class="tag">${s} <span class="remove" onclick="removeSkill('${s}')">×</span></span>`
        ).join('');
    }

    window.removeSkill = function(skill) {
        const idx = skills.indexOf(skill);
        if (idx > -1) {
            skills.splice(idx, 1);
            renderSkills();
        }
    };

    // Validação do formulário
    function validateForm() {
        const errors = [];
        const formData = new FormData(form);
        
        // Campos obrigatórios do Step 1
        if (!formData.get('nome')?.trim()) {
            errors.push('Nome completo é obrigatório');
        }
        if (!formData.get('email')?.trim()) {
            errors.push('E-mail é obrigatório');
        }
        if (!formData.get('senha')?.trim() || formData.get('senha').length < 8) {
            errors.push('Senha deve ter no mínimo 8 caracteres');
        }
        if (formData.get('senha') !== formData.get('confirmarSenha')) {
            errors.push('As senhas não coincidem');
        }
        if (!formData.get('tipoUsuario')) {
            errors.push('Selecione o tipo de usuário');
        }
        if (!formData.get('localizacao')?.trim()) {
            errors.push('Cidade/Estado é obrigatório');
        }
        
        // Campos obrigatórios do Step 2
        if (!formData.get('escolaridade')) {
            errors.push('Escolaridade é obrigatória');
        }
        if (!formData.get('curso')?.trim()) {
            errors.push('Curso/Área de formação é obrigatório');
        }
        if (!formData.get('instituicao')?.trim()) {
            errors.push('Instituição de ensino é obrigatória');
        }
        
        // Validações do Step 3
        const areasInteresse = formData.getAll('areasInteresse');
        if (areasInteresse.length === 0) {
            errors.push('Selecione pelo menos uma área de interesse');
        }
        
        if (skills.length === 0) {
            errors.push('Adicione pelo menos uma habilidade técnica');
        }
        
        const idiomas = formData.getAll('idiomas');
        if (idiomas.length === 0) {
            errors.push('Selecione pelo menos um idioma');
        }
        
        // Termos de uso
        if (!formData.get('termos')) {
            errors.push('Você deve aceitar os Termos de Uso e Política de Privacidade');
        }
        
        return errors;
    }

    function showValidationErrors(errors) {
        const alertDiv = document.getElementById('validationAlert');
        const errorList = document.getElementById('errorList');
        
        // Preencher lista de erros
        errorList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
        
        // Mostrar alerta
        alertDiv.classList.add('show');
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Form submit - usando evento no form E no botão
    form.addEventListener('submit', handleSubmit);
    
    // Também adicionar click no botão submit como fallback
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSubmit(e);
        });
    }
    
    async function handleSubmit(e) {
        if (e) e.preventDefault();
        
        console.log('Botão Criar Perfil clicado - iniciando validação...');
        
        // Esconder alerta anterior
        const alertDiv = document.getElementById('validationAlert');
        if (alertDiv) {
            alertDiv.classList.remove('show');
        }
        
        // Validar formulário
        const errors = validateForm();
        console.log('Erros encontrados:', errors);
        
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }
        
        const formData = new FormData(form);
        const data = {
            nome: formData.get('nome'),
            email: formData.get('email'),
            tipoUsuario: formData.get('tipoUsuario'),
            localizacao: formData.get('localizacao'),
            escolaridade: formData.get('escolaridade'),
            curso: formData.get('curso'),
            instituicao: formData.get('instituicao'),
            anosExperiencia: parseInt(formData.get('anosExperiencia')),
            numPublicacoes: parseInt(formData.get('numPublicacoes')),
            areasInteresse: formData.getAll('areasInteresse'),
            habilidades: skills,
            idiomas: formData.getAll('idiomas'),
            disponibilidade: formData.get('disponibilidade'),
            modalidade: formData.get('modalidade')
        };
        
        console.log('Dados do perfil:', data);
        
        // Salvar dados de autenticação após criar perfil
        const authTokens = {
            accessToken: 'mock-token-' + Date.now(),
            refreshToken: 'mock-refresh-' + Date.now(),
            expiresIn: 3600
        };
        
        const userData = {
            id: 'user-' + Date.now(),
            nome: data.nome,
            email: data.email,
            tipoUsuario: data.tipoUsuario,
            localizacao: data.localizacao,
            escolaridade: data.escolaridade,
            curso: data.curso,
            instituicao: data.instituicao,
            areasInteresse: data.areasInteresse,
            habilidades: data.habilidades,
            idiomas: data.idiomas,
            disponibilidade: data.disponibilidade,
            modalidade: data.modalidade,
            fotoPerfil: null,
            bio: ''
        };
        
        // Usar o Auth para salvar dados
        if (window.Auth && window.Auth.saveAuthData) {
            window.Auth.saveAuthData(authTokens, userData);
        } else {
            // Fallback caso Auth não esteja disponível
            localStorage.setItem('cloudops_access_token', authTokens.accessToken);
            localStorage.setItem('cloudops_user_id', userData.id);
            localStorage.setItem('cloudops_user_data', JSON.stringify(userData));
        }
        
        document.getElementById('successModal').classList.add('active');
    }
});
