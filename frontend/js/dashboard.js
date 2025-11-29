// Dashboard JS
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle for mobile
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Notification dropdown (placeholder)
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            window.location.href = 'notificacoes.html';
        });
    }
    
    // User menu dropdown (placeholder)
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.addEventListener('click', () => {
            window.location.href = 'perfil.html';
        });
    }
});
