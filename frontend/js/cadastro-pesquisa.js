// Cadastro de Pesquisa JS
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pesquisaForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
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
            habilidadesTecnicas: formData.get('habilidadesTecnicas')?.split(',').map(h => h.trim()),
            instituicao: formData.get('instituicao'),
            minParticipantes: parseInt(formData.get('minParticipantes')),
            maxParticipantes: parseInt(formData.get('maxParticipantes')),
            imprescindivel: formData.getAll('imprescindivel'),
            filtrosAdicionais: {
                localizacao: formData.get('localizacao'),
                nacionalidade: formData.get('nacionalidade'),
                experienciaMinima: parseInt(formData.get('experienciaMinima')),
                disponibilidade: formData.get('disponibilidade')
            }
        };
        
        console.log('Dados da pesquisa:', data);
        
        // Simular envio para API
        try {
            // await fetch('/api/pesquisas', { method: 'POST', body: JSON.stringify(data) });
            document.getElementById('successModal').classList.add('active');
        } catch (error) {
            alert('Erro ao cadastrar pesquisa. Tente novamente.');
        }
    });
});

function closeModal() {
    document.getElementById('successModal').classList.remove('active');
}
