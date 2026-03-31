// ============================================
// Controlador principal de la aplicación
// ============================================

let allProducts = [];
let allMovements = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    const session = await requireAuth();
    if (!session) return;

    document.getElementById('user-email').textContent = session.user.email;

    initTabs();
    await loadProducts();
});

// --- Navegación por pestañas ---

function initTabs() {
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => {
        s.hidden = true;
        s.classList.remove('active');
    });

    const link = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    const section = document.getElementById(`tab-${tabId}`);
    if (link) link.classList.add('active');
    if (section) {
        section.hidden = false;
        section.classList.add('active');
    }

    if (tabId === 'movements') loadMovements();
}

// --- Toast de notificaciones ---

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Utilidades ---

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatPrice(price) {
    if (price == null) return '-';
    return Number(price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function stockClass(qty) {
    if (qty <= 0) return 'stock-out';
    if (qty <= 3) return 'stock-low';
    return 'stock-ok';
}

const MOVEMENT_LABELS = {
    sale: 'Venta',
    restock: 'Reposición',
    adjustment: 'Ajuste',
    return: 'Devolución'
};
