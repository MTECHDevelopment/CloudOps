// Matches Page JS - Tinder-style functionality
const matchesData = [
    { id: 1, nome: 'Maria Santos', role: 'Doutoranda', area: 'Biologia Molecular', inst: 'USP', score: 98 },
    { id: 2, nome: 'Prof. Carlos Oliveira', role: 'Professor Titular', area: 'Física Quântica', inst: 'UNICAMP', score: 95 },
    { id: 3, nome: 'Ana Rodrigues', role: 'Mestranda', area: 'Estatística', inst: 'UFRJ', score: 92 }
];

const acceptedMatches = [];
let currentCardIndex = 0;

function rejectMatch(id) {
    const card = document.querySelector(`.match-card[data-id="${id}"]`);
    card.style.transform = 'translateX(-150%) rotate(-30deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        card.remove();
        updateStack();
    }, 300);
}

function acceptMatch(id) {
    const card = document.querySelector(`.match-card[data-id="${id}"]`);
    const match = matchesData.find(m => m.id === id);
    
    card.style.transform = 'translateX(150%) rotate(30deg)';
    card.style.opacity = '0';
    
    if (match) {
        acceptedMatches.push(match);
        updateAcceptedList();
    }
    
    setTimeout(() => {
        card.remove();
        updateStack();
    }, 300);
}

function updateStack() {
    const cards = document.querySelectorAll('.match-card');
    cards.forEach((card, index) => {
        if (index === 0) {
            card.style.transform = '';
            card.style.zIndex = 3;
        } else if (index === 1) {
            card.style.transform = 'scale(0.95) translateY(20px)';
            card.style.zIndex = 2;
        } else {
            card.style.transform = 'scale(0.9) translateY(40px)';
            card.style.zIndex = 1;
        }
    });
    
    if (cards.length === 0) {
        document.getElementById('matchStack').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                <p>Você viu todos os matches disponíveis!</p>
                <a href="perfil.html" class="btn btn-primary">Voltar ao Perfil</a>
            </div>
        `;
    }
}

function updateAcceptedList() {
    const list = document.getElementById('acceptedList');
    if (acceptedMatches.length === 0) return;
    
    list.innerHTML = acceptedMatches.map(m => `
        <div class="match-item">
            <div class="match-avatar"><i class="fas fa-user"></i></div>
            <div class="match-info">
                <h4>${m.nome}</h4>
                <p>${m.area} • ${m.inst}</p>
            </div>
            <div class="match-score">
                <span class="score">${m.score}%</span>
            </div>
        </div>
    `).join('');
}

function viewProfile(id) {
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function acceptMatchFromModal() {
    closeProfileModal();
    acceptMatch(1); // Aceita o primeiro card visível
}

function openRefineModal() {
    document.getElementById('refineModal').classList.add('active');
}

function closeRefineModal() {
    document.getElementById('refineModal').classList.remove('active');
}
