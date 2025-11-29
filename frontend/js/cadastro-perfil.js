// Cadastro de Perfil JS - Multi-step form - Versão Melhorada
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('perfilForm');
    if (!form) return;

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
        
        const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
        
        // Update progress indicators
        for (let i = 1; i <= step; i++) {
            const progressStep = document.querySelector(`.progress-steps .step[data-step="${i}"]`);
            if (progressStep) {
                progressStep.classList.add('active');
            }
        }
        
        // Update button visibility
        if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-flex';
        if (nextBtn) nextBtn.style.display = step === steps.length ? 'none' : 'inline-flex';
        if (submitBtn) submitBtn.style.display = step === steps.length ? 'inline-flex' : 'none';
        
        // Scroll to top of form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setupNavigation() {
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentStep < steps.length) {
                    showStep(currentStep + 1);
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            });
        }
    }

    function validateCurrentStep() {
        const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        if (!currentStepEl) return true;

        const requiredInputs = currentStepEl.querySelectorAll('[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
                
                // Show error message
                let errorMsg = input.parentElement.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;';
                    errorMsg.textContent = 'Este campo é obrigatório';
                    input.parentElement.appendChild(errorMsg);
                }
            } else {
                input.classList.remove('error');
                const errorMsg = input.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            }
        });

        // Validate email format
        const emailInput = currentStepEl.querySelector('input[type="email"]');
        if (emailInput && emailInput.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value)) {
                isValid = false;
                emailInput.classList.add('error');
                let errorMsg = emailInput.parentElement.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;';
                    errorMsg.textContent = 'Email inválido';
                    emailInput.parentElement.appendChild(errorMsg);
                }
            }
        }

        // Validate password match
        const senhaInput = document.getElementById('senha');
        const confirmarSenhaInput = document.getElementById('confirmarSenha');
        if (senhaInput && confirmarSenhaInput && senhaInput.value && confirmarSenhaInput.value) {
            if (senhaInput.value !== confirmarSenhaInput.value) {
                isValid = false;
                confirmarSenhaInput.classList.add('error');
                let errorMsg = confirmarSenhaInput.parentElement.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('span');
                    errorMsg.className = 'error-message';
                    errorMsg.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;';
                    errorMsg.textContent = 'As senhas não coincidem';
                    confirmarSenhaInput.parentElement.appendChild(errorMsg);
                }
            }
        }

        if (!isValid && typeof showNotification === 'function') {
            showNotification('Por favor, preencha todos os campos obrigatórios', 'error');
        }

        return isValid;
    }

    function setupSkillsInput() {
        const skillsInput = document.getElementById('habilidadesInput');
        const skillsContainer = document.getElementById('habilidadesTags');

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
                
                // Re-enable suggestion button
                document.querySelectorAll('.skill-tag').forEach(btn => {
                    if ((btn.dataset.skill || btn.textContent.trim()) === skill) {
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                    }
                });
            }
        };
    }

    function setupValidation() {
        // Remove error styling on input
        form.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
                const errorMsg = this.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();
            });
        });
    }

    function setupSubmit() {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateCurrentStep()) {
                return;
            }

            const formData = new FormData(form);
            const data = {
                nome: formData.get('nome'),
                email: formData.get('email'),
                senha: formData.get('senha'),
                tipoUsuario: formData.get('tipoUsuario'),
                localizacao: formData.get('localizacao'),
                escolaridade: formData.get('escolaridade'),
                curso: formData.get('curso'),
                instituicao: formData.get('instituicao'),
                anosExperiencia: parseInt(formData.get('anosExperiencia')) || 0,
                numPublicacoes: parseInt(formData.get('numPublicacoes')) || 0,
                areasInteresse: formData.getAll('areasInteresse'),
                habilidades: skills,
                idiomas: getIdiomasData(formData),
                disponibilidade: formData.get('disponibilidade'),
                modalidade: formData.get('modalidade')
            };
            
            // Disable submit button
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
            }

            try {
                console.log('Dados do perfil:', data);
                
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Show success modal
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.classList.add('active');
                } else if (typeof showNotification === 'function') {
                    showNotification('Perfil cadastrado com sucesso!', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            } catch (error) {
                console.error('Erro ao cadastrar perfil:', error);
                if (typeof showNotification === 'function') {
                    showNotification('Erro ao cadastrar perfil. Tente novamente.', 'error');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Finalizar Cadastro';
                }
            }
        });
    }

    function getIdiomasData(formData) {
        const idiomas = [];
        const idiomaCheckboxes = document.querySelectorAll('.idioma-item input[type="checkbox"]:checked');
        
        idiomaCheckboxes.forEach(checkbox => {
            const idiomaItem = checkbox.closest('.idioma-item');
            const nivelSelect = idiomaItem.querySelector('.nivel-idioma');
            if (nivelSelect) {
                idiomas.push({
                    idioma: checkbox.value,
                    nivel: nivelSelect.value
                });
            }
        });
        
        return idiomas;
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
});
