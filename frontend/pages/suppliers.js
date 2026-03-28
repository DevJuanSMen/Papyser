/* ── Suppliers (Proveedores) Page ── */
async function renderSuppliers(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="section-header">
                <h3>🏢 Proveedores</h3>
                <button class="btn btn-primary" onclick="showCreateSupplierModal()">
                    <i data-lucide="plus"></i> Nuevo Proveedor
                </button>
            </div>
            
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3>Todos los Proveedores</h3>
                </div>
                <div id="suppliers-list">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons({ nodes: [container] });
    loadSuppliersList();
}

async function loadSuppliersList() {
    try {
        const data = await apiCall('/suppliers');
        const listEl = document.getElementById('suppliers-list');
        
        if (!data.suppliers || data.suppliers.length === 0) {
            listEl.innerHTML = `<div class="empty-state">
                <i data-lucide="building-2"></i>
                <h3>Sin proveedores</h3>
                <p>Registra tu primer proveedor</p>
            </div>`;
            lucide.createIcons({ nodes: [listEl] });
            return;
        }
        
        listEl.innerHTML = `<table class="data-table">
            <thead><tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Categoría</th>
                <th>Score</th>
            </tr></thead>
            <tbody>
                ${data.suppliers.map(s => `
                    <tr onclick="showSupplierDetail(${s.id})">
                        <td>${s.name}</td>
                        <td>${s.nit || '-'}</td>
                        <td>${s.contact_name || '-'}</td>
                        <td>${s.email || '-'}</td>
                        <td><span class="badge tipo-otro">${s.category || '-'}</span></td>
                        <td>${renderStarScore(s.score)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
        
        lucide.createIcons({ nodes: [listEl] });
    } catch (err) {
        document.getElementById('suppliers-list').innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

function renderStarScore(score) {
    if (!score) return '-';
    const color = score >= 4 ? 'var(--success)' : score >= 3 ? 'var(--warning)' : 'var(--danger)';
    return `<span style="font-weight:600;color:${color};">★ ${parseFloat(score).toFixed(1)}</span>`;
}

function showCreateSupplierModal() {
    openModal('Nuevo Proveedor', `
        <form id="create-supplier-form" class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Nombre de la Empresa *</label>
                <input type="text" id="cs-name" required placeholder="Ej: Distribuidora Nacional S.A.S">
            </div>
            <div class="form-group">
                <label>NIT</label>
                <input type="text" id="cs-nit" placeholder="Ej: 900123456-1">
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="cs-category">
                    <option value="">Seleccionar</option>
                    <option value="suministros">Suministros</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="papeleria">Papelería</option>
                    <option value="servicios">Servicios</option>
                    <option value="construccion">Construcción</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Contacto</label>
                <input type="text" id="cs-contact" placeholder="Nombre del contacto">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="cs-email" placeholder="correo@empresa.com">
            </div>
            <div class="form-group">
                <label>Teléfono</label>
                <input type="text" id="cs-phone" placeholder="601-555-0000">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Dirección</label>
                <input type="text" id="cs-address" placeholder="Dirección completa">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitCreateSupplier()">
            <i data-lucide="plus"></i> Registrar
        </button>
    `);
}

async function submitCreateSupplier() {
    try {
        await apiCall('/suppliers', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('cs-name').value,
                nit: document.getElementById('cs-nit').value || null,
                category: document.getElementById('cs-category').value || null,
                contact_name: document.getElementById('cs-contact').value || null,
                email: document.getElementById('cs-email').value || null,
                phone: document.getElementById('cs-phone').value || null,
                address: document.getElementById('cs-address').value || null,
            })
        });
        closeModal();
        showToast('Proveedor registrado', 'success');
        loadSuppliersList();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function showSupplierDetail(id) {
    try {
        const data = await apiCall(`/suppliers/${id}`);
        const s = data.supplier;
        const history = data.quotation_history || [];
        
        openModal(s.name, `
            <div class="form-grid" style="margin-bottom:20px;">
                <div class="form-group"><label>NIT</label><p>${s.nit || '-'}</p></div>
                <div class="form-group"><label>Categoría</label><span class="badge tipo-otro">${s.category || '-'}</span></div>
                <div class="form-group"><label>Contacto</label><p>${s.contact_name || '-'}</p></div>
                <div class="form-group"><label>Email</label><p>${s.email || '-'}</p></div>
                <div class="form-group"><label>Teléfono</label><p>${s.phone || '-'}</p></div>
                <div class="form-group"><label>Score</label><p>${renderStarScore(s.score)}</p></div>
            </div>
            
            <div style="border-top:1px solid var(--border-color);padding-top:18px;">
                <h4 style="font-size:0.95rem;margin-bottom:14px;">Historial de Cotizaciones (${history.length})</h4>
                ${history.length > 0 ? `
                    <table class="data-table">
                        <thead><tr><th>Compra</th><th>Precio</th><th>Entrega</th><th>Fecha</th></tr></thead>
                        <tbody>
                            ${history.map(h => `
                                <tr>
                                    <td>${h.purchase_code || '-'} ${h.purchase_title || ''}</td>
                                    <td>${formatCurrency(h.total_price)}</td>
                                    <td>${h.delivery_days ? h.delivery_days + ' días' : '-'}</td>
                                    <td>${formatDate(h.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color:var(--text-muted);font-size:0.85rem;">Sin historial de cotizaciones</p>'}
            </div>
        `, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}
