// Cadastro de Perfil JS - Multi-step form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('perfilForm');
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-steps .step');
    const prevBtn = document.querySelector('.prev-step');
    const nextBtn = document.querySelector('.next-step');
    const submitBtn = document.querySelector('.submit-btn');
    let currentStep = 1;

    function showStep(step) {
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
