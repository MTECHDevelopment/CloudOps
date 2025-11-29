// Cadastro de Perfil JS - Multi-step form - Versão Melhorada
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('perfilForm');
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-steps .step');
    const prevBtn = document.querySelector('.prev-step');
    const nextBtn = document.querySelector('.next-step');
    const submitBtn = document.querySelector('.submit-btn');
    let currentStep = 1;
    const skills = [];

    // Initialize form
    initializeForm();

    function initializeForm() {
        // Show first step
        showStep(1);
        
        // Setup navigation buttons
        setupNavigation();
        
        // Setup skills input
        setupSkillsInput();
        
        // Setup form validation
        setupValidation();
        
        // Setup form submit
        setupSubmit();
    }

    function showStep(step) {
        // Validate current step before moving forward
        if (step > currentStep && !validateCurrentStep()) {
            return;
        }

        currentStep = step;
        
        // Update step visibility
        steps.forEach(s => s.classList.remove('active'));
        progressSteps.forEach(s => s.classList.remove('active'));
        
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
        for (let i = 1; i <= step; i++) {
            document.querySelector(`.progress-steps .step[data-step="${i}"]`).classList.add('active');
        }
        
        prevBtn.style.display = step === 1 ? 'none' : 'flex';
        nextBtn.style.display = step === 3 ? 'none' : 'flex';
        submitBtn.style.display = step === 3 ? 'flex' : 'none';
    }

    nextBtn.addEventListener('click', () => {
        if (currentStep < 3) {
            currentStep++;
            showStep(currentStep);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // Skills input
    const skillsInput = document.getElementById('habilidadesInput');
    const skillsContainer = document.getElementById('habilidadesTags');
    const skills = [];

        if (skillsInput && skillsContainer) {
            skillsInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const skill = this.value.trim();
                    if (skill && !skills.includes(skill)) {
                        skills.push(skill);
                        renderSkills();
                        this.value = '';
                    } else if (skills.includes(skill)) {
                        if (typeof showNotification === 'function') {
                            showNotification('Esta habilidade já foi adicionada', 'error');
                        }
                    }
                }
            });
        }

        // Skill suggestions
        document.querySelectorAll('.skill-tag').forEach(btn => {
            btn.addEventListener('click', function() {
                const skill = this.dataset.skill || this.textContent.trim();
                if (skill && !skills.includes(skill)) {
                    skills.push(skill);
                    renderSkills();
                    this.style.opacity = '0.5';
                    this.style.pointerEvents = 'none';
                }
            });
        });

        function renderSkills() {
            if (!skillsContainer) return;
            
            skillsContainer.innerHTML = skills.map(s => 
                `<span class="tag">${escapeHtml(s)} <span class="remove" data-skill="${escapeHtml(s)}" style="cursor: pointer;">×</span></span>`
            ).join('');
            
            // Add remove listeners
            skillsContainer.querySelectorAll('.remove').forEach(btn => {
                btn.addEventListener('click', function() {
                    const skill = this.dataset.skill;
                    removeSkill(skill);
                });
            });
        }

    window.removeSkill = function(skill) {
        const idx = skills.indexOf(skill);
        if (idx > -1) {
            skills.splice(idx, 1);
            renderSkills();
        }
    };

    // Form submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
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
        document.getElementById('successModal').classList.add('active');
    });
});
