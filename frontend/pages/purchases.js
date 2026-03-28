/* ── Purchases (Compras) Page ── */
async function renderPurchases(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="section-header">
                <h3>🛒 Solicitudes de Compra</h3>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" onclick="showCreatePurchaseModal()">
                        <i data-lucide="plus"></i> Nueva Solicitud
                    </button>
                </div>
            </div>
            
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3>Todas las Solicitudes</h3>
                    <div class="section-tabs" id="purchase-tabs">
                        <button class="section-tab active" onclick="filterPurchases('')">Todas</button>
                        <button class="section-tab" onclick="filterPurchases('nueva')">Nuevas</button>
                        <button class="section-tab" onclick="filterPurchases('cotizacion')">Cotización</button>
                        <button class="section-tab" onclick="filterPurchases('aprobacion')">Aprobación</button>
                    </div>
                </div>
                <div id="purchases-list">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons({ nodes: [container] });
    loadPurchasesList();
}

async function loadPurchasesList(status = '') {
    try {
        const url = status ? `/purchases?status=${status}` : '/purchases';
        const data = await apiCall(url);
        const listEl = document.getElementById('purchases-list');
        
        if (!data.purchases || data.purchases.length === 0) {
            listEl.innerHTML = `<div class="empty-state">
                <i data-lucide="shopping-cart"></i>
                <h3>Sin solicitudes</h3>
                <p>Crea tu primera solicitud de compra</p>
            </div>`;
            lucide.createIcons({ nodes: [listEl] });
            return;
        }
        
        listEl.innerHTML = `<table class="data-table">
            <thead><tr>
                <th>Código</th>
                <th>Título</th>
                <th>Área</th>
                <th>Urgencia</th>
                <th>Presupuesto</th>
                <th>Estado</th>
                <th>Fecha</th>
            </tr></thead>
            <tbody>
                ${data.purchases.map(p => `
                    <tr onclick="showPurchaseDetail(${p.id})">
                        <td style="color:var(--accent-primary);font-weight:600;">${p.code || '-'}</td>
                        <td>${p.title}</td>
                        <td>${p.requesting_area || '-'}</td>
                        <td><span class="badge urgency-${p.urgency}">${p.urgency}</span></td>
                        <td>${formatCurrency(p.estimated_budget)}</td>
                        <td><span class="badge ${p.status}">${statusLabel(p.status)}</span></td>
                        <td>${formatDate(p.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
        
        lucide.createIcons({ nodes: [listEl] });
    } catch (err) {
        document.getElementById('purchases-list').innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

function filterPurchases(status) {
    document.querySelectorAll('#purchase-tabs .section-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadPurchasesList(status);
}

function showCreatePurchaseModal() {
    openModal('Nueva Solicitud de Compra', `
        <form id="create-purchase-form" class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Título *</label>
                <input type="text" id="cp-title" required placeholder="Ej: Compra de resmas de papel">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Descripción</label>
                <textarea id="cp-description" rows="2" placeholder="Detalle de la necesidad"></textarea>
            </div>
            <div class="form-group">
                <label>Producto/Servicio *</label>
                <input type="text" id="cp-product" required placeholder="Ej: Papel carta">
            </div>
            <div class="form-group">
                <label>Área Solicitante</label>
                <input type="text" id="cp-area" placeholder="Ej: Administrativa">
            </div>
            <div class="form-group">
                <label>Cantidad</label>
                <input type="number" id="cp-quantity" step="0.01" placeholder="0">
            </div>
            <div class="form-group">
                <label>Unidad</label>
                <input type="text" id="cp-unit" placeholder="Ej: unidades, resmas">
            </div>
            <div class="form-group">
                <label>Urgencia</label>
                <select id="cp-urgency">
                    <option value="baja">Baja</option>
                    <option value="media" selected>Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                </select>
            </div>
            <div class="form-group">
                <label>Centro de Costo</label>
                <input type="text" id="cp-cost-center" placeholder="Ej: ADM-001">
            </div>
            <div class="form-group">
                <label>Fecha Requerida</label>
                <input type="date" id="cp-date">
            </div>
            <div class="form-group">
                <label>Presupuesto Estimado (COP)</label>
                <input type="number" id="cp-budget" step="1" placeholder="0">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitCreatePurchase()">
            <i data-lucide="plus"></i> Crear Solicitud
        </button>
    `);
}

async function submitCreatePurchase() {
    try {
        await apiCall('/purchases', {
            method: 'POST',
            body: JSON.stringify({
                title: document.getElementById('cp-title').value,
                description: document.getElementById('cp-description').value,
                product_service: document.getElementById('cp-product').value,
                requesting_area: document.getElementById('cp-area').value,
                quantity: parseFloat(document.getElementById('cp-quantity').value) || null,
                unit: document.getElementById('cp-unit').value || null,
                urgency: document.getElementById('cp-urgency').value,
                cost_center: document.getElementById('cp-cost-center').value || null,
                required_date: document.getElementById('cp-date').value || null,
                estimated_budget: parseFloat(document.getElementById('cp-budget').value) || null,
            })
        });
        
        closeModal();
        showToast('Solicitud creada exitosamente', 'success');
        loadPurchasesList();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function showPurchaseDetail(id) {
    try {
        const data = await apiCall(`/purchases/${id}`);
        const p = data.purchase;
        const quotations = data.quotations || [];
        
        openModal(`${p.code} — ${p.title}`, `
            <div class="form-grid" style="margin-bottom:20px;">
                <div class="form-group"><label>Estado</label><span class="badge ${p.status}">${statusLabel(p.status)}</span></div>
                <div class="form-group"><label>Urgencia</label><span class="badge urgency-${p.urgency}">${p.urgency}</span></div>
                <div class="form-group"><label>Área</label><p>${p.requesting_area || '-'}</p></div>
                <div class="form-group"><label>Producto</label><p>${p.product_service}</p></div>
                <div class="form-group"><label>Cantidad</label><p>${p.quantity || '-'} ${p.unit || ''}</p></div>
                <div class="form-group"><label>Presupuesto</label><p>${formatCurrency(p.estimated_budget)}</p></div>
                <div class="form-group"><label>Fecha Requerida</label><p>${formatDate(p.required_date)}</p></div>
                <div class="form-group"><label>Centro Costo</label><p>${p.cost_center || '-'}</p></div>
            </div>
            ${p.description ? `<p style="color:var(--text-secondary);font-size:0.85rem;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);margin-bottom:20px;">${p.description}</p>` : ''}
            
            <div style="border-top:1px solid var(--border-color);padding-top:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="font-size:0.95rem;">Cotizaciones (${quotations.length})</h4>
                    <button class="btn btn-sm btn-secondary" onclick="showAddQuotationModal(${id})">
                        <i data-lucide="plus"></i> Agregar
                    </button>
                </div>
                ${quotations.length > 0 ? `
                    <table class="data-table">
                        <thead><tr><th>Proveedor</th><th>Precio</th><th>Entrega</th><th>Pago</th></tr></thead>
                        <tbody>
                            ${quotations.map(q => `
                                <tr>
                                    <td>${q.supplier_name || '-'}</td>
                                    <td>${formatCurrency(q.total_price)}</td>
                                    <td>${q.delivery_days ? q.delivery_days + ' días' : '-'}</td>
                                    <td>${q.payment_terms || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${quotations.length >= 2 ? `
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="showComparison(${id})">
                            <i data-lucide="bar-chart-3"></i> Ver Comparación
                        </button>
                    ` : ''}
                ` : '<p style="color:var(--text-muted);font-size:0.85rem;">Aún no hay cotizaciones</p>'}
            </div>
        `, `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${p.status === 'nueva' || p.status === 'cotizacion' ? `
                    <button class="btn btn-sm btn-secondary" onclick="updatePurchaseStatus(${id}, 'aprobacion')">Enviar a Aprobación</button>
                ` : ''}
                ${p.status === 'aprobacion' ? `
                    <button class="btn btn-sm btn-primary" onclick="updatePurchaseStatus(${id}, 'orden_compra')">Aprobar</button>
                    <button class="btn btn-sm btn-danger" onclick="updatePurchaseStatus(${id}, 'cancelada')">Rechazar</button>
                ` : ''}
                <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cerrar</button>
            </div>
        `);
        
        lucide.createIcons({ nodes: [document.getElementById('modal-container')] });
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function showAddQuotationModal(purchaseId) {
    openModal('Agregar Cotización', `
        <form id="add-quotation-form" class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Proveedor *</label>
                <input type="text" id="aq-supplier" required placeholder="Nombre del proveedor">
            </div>
            <div class="form-group">
                <label>Precio Total</label>
                <input type="number" id="aq-total" step="0.01" placeholder="0">
            </div>
            <div class="form-group">
                <label>Precio Unitario</label>
                <input type="number" id="aq-unit-price" step="0.01" placeholder="0">
            </div>
            <div class="form-group">
                <label>Días de Entrega</label>
                <input type="number" id="aq-delivery" placeholder="0">
            </div>
            <div class="form-group">
                <label>Condiciones de Pago</label>
                <input type="text" id="aq-payment" placeholder="Ej: 30 días">
            </div>
            <div class="form-group">
                <label>Garantía</label>
                <input type="text" id="aq-warranty" placeholder="Ej: 1 año">
            </div>
            <div class="form-group">
                <label>Vigencia</label>
                <input type="date" id="aq-validity">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="showPurchaseDetail(${purchaseId})">Cancelar</button>
        <button class="btn btn-primary" onclick="submitQuotation(${purchaseId})">Guardar</button>
    `);
}

async function submitQuotation(purchaseId) {
    try {
        await apiCall(`/purchases/${purchaseId}/quotations`, {
            method: 'POST',
            body: JSON.stringify({
                supplier_name: document.getElementById('aq-supplier').value,
                total_price: parseFloat(document.getElementById('aq-total').value) || null,
                unit_price: parseFloat(document.getElementById('aq-unit-price').value) || null,
                delivery_days: parseInt(document.getElementById('aq-delivery').value) || null,
                payment_terms: document.getElementById('aq-payment').value || null,
                warranty: document.getElementById('aq-warranty').value || null,
                validity_date: document.getElementById('aq-validity').value || null,
            })
        });
        showToast('Cotización agregada', 'success');
        showPurchaseDetail(purchaseId);
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function showComparison(purchaseId) {
    try {
        const data = await apiCall(`/purchases/${purchaseId}/compare`);
        const comp = data.comparison;
        
        openModal('Comparación de Cotizaciones', `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
                <div style="padding:16px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem;color:var(--success);font-weight:600;">💰 MEJOR PRECIO</div>
                    <div style="font-size:1.1rem;font-weight:700;margin-top:6px;">${comp.best_price?.supplier_name || '-'}</div>
                    <div style="color:var(--text-secondary);font-size:0.85rem;">${formatCurrency(comp.best_price?.total_price)}</div>
                </div>
                <div style="padding:16px;background:rgba(6,182,212,0.05);border:1px solid rgba(6,182,212,0.2);border-radius:var(--radius-md);">
                    <div style="font-size:0.75rem;color:var(--accent-secondary);font-weight:600;">⚡ MÁS RÁPIDO</div>
                    <div style="font-size:1.1rem;font-weight:700;margin-top:6px;">${comp.fastest_delivery?.supplier_name || '-'}</div>
                    <div style="color:var(--text-secondary);font-size:0.85rem;">${comp.fastest_delivery?.delivery_days || '?'} días</div>
                </div>
            </div>
            <table class="data-table">
                <thead><tr><th>Proveedor</th><th>Precio</th><th>Entrega</th><th>Pago</th><th>Garantía</th></tr></thead>
                <tbody>
                    ${data.quotations.map(q => `
                        <tr>
                            <td>${q.supplier_name}</td>
                            <td>${formatCurrency(q.total_price)}</td>
                            <td>${q.delivery_days ? q.delivery_days + ' días' : '-'}</td>
                            <td>${q.payment_terms || '-'}</td>
                            <td>${q.warranty || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `, '<button class="btn btn-secondary" onclick="showPurchaseDetail(' + purchaseId + ')">Volver</button>');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function updatePurchaseStatus(id, newStatus) {
    try {
        await apiCall(`/purchases/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        showToast('Estado actualizado', 'success');
        closeModal();
        loadPurchasesList();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}
