/* ═══════════════════════════════════════════════════════════
   PAPYSER IA — Main Application (SPA Router & Core Logic)
   ═══════════════════════════════════════════════════════════ */

const API_URL = window.location.origin + '/api';

// ── State ──
let currentUser = null;
let currentPage = 'dashboard';

// ── Auth Helpers ──
function getToken() { return localStorage.getItem('papyser_token'); }
function setToken(token) { localStorage.setItem('papyser_token', token); }
function removeToken() { localStorage.removeItem('papyser_token'); localStorage.removeItem('papyser_user'); }

function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('papyser_user')); }
    catch { return null; }
}

function setStoredUser(user) { localStorage.setItem('papyser_user', JSON.stringify(user)); }

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 401) {
        removeToken();
        showLogin();
        throw new Error('Sesión expirada');
    }
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(err.detail || 'Error en la solicitud');
    }
    
    // Handle blob responses (Excel export)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('spreadsheet')) {
        return response.blob();
    }
    
    return response.json();
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ nodes: [toast] });
    
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ── Modal ──
function openModal(title, bodyHtml, footerHtml = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
    lucide.createIcons({ nodes: [document.getElementById('modal-container')] });
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ── Login ──
function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-layout').classList.add('hidden');
    currentUser = null;
}

function showApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');
    updateUserUI();
}

function updateUserUI() {
    if (!currentUser) return;
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = currentUser.role;
    
    // Hide settings for non-admin
    const settingsNav = document.getElementById('nav-settings');
    if (currentUser.role !== 'admin') {
        settingsNav.style.display = 'none';
    } else {
        settingsNav.style.display = '';
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');
    
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
    errorEl.classList.add('hidden');
    
    try {
        const data = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => {
            if (!r.ok) throw new Error('Credenciales inválidas');
            return r.json();
        });
        
        setToken(data.token);
        setStoredUser(data.user);
        currentUser = data.user;
        showApp();
        navigate('dashboard');
        showToast(`Bienvenido, ${currentUser.full_name}`, 'success');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Iniciar Sesión</span><i data-lucide="arrow-right"></i>';
        lucide.createIcons({ nodes: [btn] });
    }
});

// ── Logout ──
document.getElementById('btn-logout').addEventListener('click', () => {
    removeToken();
    showLogin();
    showToast('Sesión cerrada', 'info');
});

// ── Router ──
const pages = {
    dashboard: { title: 'Dashboard', render: renderDashboard },
    documents: { title: 'IA Documental', render: renderDocuments },
    purchases: { title: 'Compras', render: renderPurchases },
    bids: { title: 'Licitaciones', render: renderBids },
    suppliers: { title: 'Proveedores', render: renderSuppliers },
    settings: { title: 'Configuración', render: renderSettings },
};

function navigate(page) {
    window.location.hash = `#/${page}`;
}

function handleRoute() {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';
    const page = hash.split('/')[0];
    
    if (!pages[page]) { navigate('dashboard'); return; }
    
    currentPage = page;
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update title
    document.getElementById('page-title').textContent = pages[page].title;
    
    // Render page
    const content = document.getElementById('page-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    
    try {
        pages[page].render(content, hash);
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><h3>Error cargando página</h3><p>${err.message}</p></div>`;
    }
}

window.addEventListener('hashchange', handleRoute);

// ── Sidebar ──
document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
});

// Close mobile menu on nav click
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('mobile-open');
    });
});

// ── Format Helpers ──
function formatCurrency(value) {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
}

function statusLabel(status) {
    const labels = {
        nueva: 'Nueva', cotizacion: 'Cotización', comparacion: 'Comparación',
        aprobacion: 'Aprobación', orden_compra: 'Orden de Compra', entregada: 'Entregada',
        cerrada: 'Cerrada', cancelada: 'Cancelada',
        detectada: 'Detectada', analisis: 'En Análisis', viable: 'Viable',
        no_viable: 'No Viable', documentacion: 'Documentación', elaboracion: 'Elaboración',
        presentada: 'Presentada', subsanacion: 'Subsanación', adjudicada: 'Adjudicada',
        no_adjudicada: 'No Adjudicada'
    };
    return labels[status] || status;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    const token = getToken();
    const user = getStoredUser();
    
    if (token && user) {
        currentUser = user;
        showApp();
        handleRoute();
    } else {
        showLogin();
    }
});
