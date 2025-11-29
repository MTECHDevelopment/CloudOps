// CloudOps - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Collapsible sections
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });

    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Idioma checkboxes - enable/disable nivel select
    document.querySelectorAll('.idioma-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const select = this.closest('.idioma-item').querySelector('.nivel-idioma');
            if (select) {
                select.disabled = !this.checked;
                if (!this.checked) select.value = '';
            }
        });
    });
});

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});
