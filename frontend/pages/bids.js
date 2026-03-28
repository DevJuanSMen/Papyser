/* ── Bids (Licitaciones) Page ── */
async function renderBids(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="section-header">
                <h3>📑 Licitaciones</h3>
                <button class="btn btn-primary" onclick="showCreateBidModal()">
                    <i data-lucide="plus"></i> Nueva Oportunidad
                </button>
            </div>
            
            <div class="data-table-container">
                <div class="data-table-header">
                    <h3>Oportunidades</h3>
                    <div class="section-tabs" id="bid-tabs">
                        <button class="section-tab active" onclick="filterBids('')">Todas</button>
                        <button class="section-tab" onclick="filterBids('analisis')">Análisis</button>
                        <button class="section-tab" onclick="filterBids('viable')">Viables</button>
                        <button class="section-tab" onclick="filterBids('documentacion')">Documentación</button>
                        <button class="section-tab" onclick="filterBids('presentada')">Presentadas</button>
                    </div>
                </div>
                <div id="bids-list">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons({ nodes: [container] });
    loadBidsList();
}

async function loadBidsList(status = '') {
    try {
        const url = status ? `/bids?status=${status}` : '/bids';
        const data = await apiCall(url);
        const listEl = document.getElementById('bids-list');
        
        if (!data.bids || data.bids.length === 0) {
            listEl.innerHTML = `<div class="empty-state">
                <i data-lucide="scroll-text"></i>
                <h3>Sin licitaciones</h3>
                <p>Crea tu primera oportunidad de licitación</p>
            </div>`;
            lucide.createIcons({ nodes: [listEl] });
            return;
        }
        
        listEl.innerHTML = `<table class="data-table">
            <thead><tr>
                <th>Código</th>
                <th>Título</th>
                <th>Entidad</th>
                <th>Presupuesto</th>
                <th>Cierre</th>
                <th>Viabilidad</th>
                <th>Riesgo</th>
                <th>Estado</th>
            </tr></thead>
            <tbody>
                ${data.bids.map(b => `
                    <tr onclick="showBidDetail(${b.id})">
                        <td style="color:var(--accent-primary);font-weight:600;">${b.code || '-'}</td>
                        <td>${b.title}</td>
                        <td>${b.entity || '-'}</td>
                        <td>${formatCurrency(b.budget)}</td>
                        <td>${formatDate(b.close_date)}</td>
                        <td>${b.viability_score ? renderMiniScore(b.viability_score) : '-'}</td>
                        <td>${b.risk_level ? `<span class="badge risk-${b.risk_level}">${b.risk_level}</span>` : '-'}</td>
                        <td><span class="badge ${b.status}">${statusLabel(b.status)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
        
        lucide.createIcons({ nodes: [listEl] });
    } catch (err) {
        document.getElementById('bids-list').innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

function renderMiniScore(score) {
    const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
    return `<span style="font-weight:600;color:${color};">${Math.round(score)}%</span>`;
}

function filterBids(status) {
    document.querySelectorAll('#bid-tabs .section-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    loadBidsList(status);
}

function showCreateBidModal() {
    openModal('Nueva Oportunidad de Licitación', `
        <form id="create-bid-form" class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Título de la Licitación *</label>
                <input type="text" id="cb-title" required placeholder="Ej: Suministro de papelería para MinEducación">
            </div>
            <div class="form-group">
                <label>Entidad Contratante</label>
                <input type="text" id="cb-entity" placeholder="Ej: Ministerio de Educación">
            </div>
            <div class="form-group">
                <label>Plataforma</label>
                <select id="cb-platform">
                    <option value="">Seleccionar</option>
                    <option value="SECOP I">SECOP I</option>
                    <option value="SECOP II">SECOP II</option>
                    <option value="Privada">Privada</option>
                    <option value="Invitación directa">Invitación directa</option>
                    <option value="Otra">Otra</option>
                </select>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Objeto del Contrato</label>
                <textarea id="cb-object" rows="2" placeholder="Descripción del objeto contractual"></textarea>
            </div>
            <div class="form-group">
                <label>Presupuesto Oficial (COP)</label>
                <input type="number" id="cb-budget" step="1" placeholder="0">
            </div>
            <div class="form-group">
                <label>Fecha de Cierre</label>
                <input type="date" id="cb-close-date">
            </div>
            <div class="form-group">
                <label>Fecha Límite Observaciones</label>
                <input type="date" id="cb-obs-date">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitCreateBid()">
            <i data-lucide="plus"></i> Crear Oportunidad
        </button>
    `);
}

async function submitCreateBid() {
    try {
        await apiCall('/bids', {
            method: 'POST',
            body: JSON.stringify({
                title: document.getElementById('cb-title').value,
                entity: document.getElementById('cb-entity').value || null,
                object_description: document.getElementById('cb-object').value || null,
                budget: parseFloat(document.getElementById('cb-budget').value) || null,
                source_platform: document.getElementById('cb-platform').value || null,
                close_date: document.getElementById('cb-close-date').value || null,
                observation_deadline: document.getElementById('cb-obs-date').value || null,
            })
        });
        closeModal();
        showToast('Licitación creada exitosamente', 'success');
        loadBidsList();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function showBidDetail(id) {
    try {
        const data = await apiCall(`/bids/${id}`);
        const b = data.bid;
        const checklist = data.checklist || [];
        
        let risksHtml = '';
        if (b.ai_risks) {
            try {
                const risks = JSON.parse(b.ai_risks);
                risksHtml = risks.map(r => `<div style="padding:6px 0;color:var(--text-secondary);font-size:0.85rem;">⚠️ ${r}</div>`).join('');
            } catch { risksHtml = `<p style="font-size:0.85rem;">${b.ai_risks}</p>`; }
        }
        
        openModal(`${b.code} — ${b.title}`, `
            <div class="form-grid" style="margin-bottom:20px;">
                <div class="form-group"><label>Estado</label><span class="badge ${b.status}">${statusLabel(b.status)}</span></div>
                <div class="form-group"><label>Riesgo</label>${b.risk_level ? `<span class="badge risk-${b.risk_level}">${b.risk_level}</span>` : '-'}</div>
                <div class="form-group"><label>Entidad</label><p>${b.entity || '-'}</p></div>
                <div class="form-group"><label>Plataforma</label><p>${b.source_platform || '-'}</p></div>
                <div class="form-group"><label>Presupuesto</label><p>${formatCurrency(b.budget)}</p></div>
                <div class="form-group"><label>Cierre</label><p>${formatDate(b.close_date)}</p></div>
            </div>
            
            ${b.viability_score ? `
                <div style="margin-bottom:20px;">
                    <label style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:8px;">Score de Viabilidad</label>
                    <div class="score-meter">
                        <div class="score-bar"><div class="score-fill ${b.viability_score >= 70 ? 'high' : b.viability_score >= 40 ? 'medium' : 'low'}" style="width:${b.viability_score}%"></div></div>
                        <div class="score-value">${Math.round(b.viability_score)}%</div>
                    </div>
                </div>
            ` : ''}
            
            ${b.ai_summary ? `
                <div style="padding:14px;background:var(--bg-glass);border-radius:var(--radius-sm);margin-bottom:18px;">
                    <div style="font-size:0.75rem;color:var(--accent-primary);font-weight:600;margin-bottom:6px;">🧠 RESUMEN IA</div>
                    <p style="color:var(--text-secondary);font-size:0.85rem;">${b.ai_summary}</p>
                </div>
            ` : ''}
            
            ${risksHtml ? `
                <div style="margin-bottom:18px;">
                    <div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;">Riesgos Identificados</div>
                    ${risksHtml}
                </div>
            ` : ''}
            
            <!-- Analyze with AI -->
            <div style="padding:16px;border:1px dashed var(--border-light);border-radius:var(--radius-md);margin-bottom:18px;text-align:center;">
                <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">Sube el pliego para análisis automático con IA</p>
                <input type="file" id="bid-pliego-file" accept=".pdf,image/*" hidden>
                <button class="btn btn-sm btn-primary" onclick="document.getElementById('bid-pliego-file').click()">
                    <i data-lucide="brain-circuit"></i> Analizar Pliego con IA
                </button>
                <div id="bid-analyze-status" class="hidden" style="margin-top:12px;">
                    <div class="spinner" style="margin:0 auto;"></div>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">Analizando pliego...</p>
                </div>
            </div>
            
            <!-- Checklist -->
            <div style="border-top:1px solid var(--border-color);padding-top:18px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h4 style="font-size:0.95rem;">Checklist Documental (${checklist.length})</h4>
                </div>
                <div id="bid-checklist-container">
                    ${checklist.length > 0 ? checklist.map(item => `
                        <div class="checklist-item">
                            <div class="checklist-status ${item.status}" onclick="toggleChecklistStatus(${b.id}, ${item.id}, '${item.status}')">
                                <i data-lucide="${item.status === 'tiene' ? 'check' : item.status === 'falta' ? 'x' : item.status === 'vencido' ? 'alert-triangle' : 'circle'}"></i>
                            </div>
                            <div class="checklist-info">
                                <div class="checklist-name">${item.document_name}</div>
                                <div class="checklist-area">${item.responsible_area || 'Sin asignar'}</div>
                            </div>
                            <span class="badge ${item.status}">${item.status}</span>
                        </div>
                    `).join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">Analiza el pliego para generar el checklist automáticamente</p>'}
                </div>
            </div>
        `, `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${b.status === 'analisis' ? `<button class="btn btn-sm btn-primary" onclick="updateBidStatus(${id}, 'viable')">Marcar Viable</button>` : ''}
                ${b.status === 'viable' || b.status === 'analisis' ? `<button class="btn btn-sm btn-danger" onclick="updateBidStatus(${id}, 'no_viable')">No Viable</button>` : ''}
                ${b.status === 'documentacion' || b.status === 'elaboracion' ? `<button class="btn btn-sm btn-primary" onclick="updateBidStatus(${id}, 'presentada')">Marcar Presentada</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cerrar</button>
            </div>
        `);
        
        lucide.createIcons({ nodes: [document.getElementById('modal-container')] });
        
        // Wire up file input for AI analysis
        document.getElementById('bid-pliego-file').addEventListener('change', (e) => analyzeBidPliego(id, e.target.files[0]));
        
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function analyzeBidPliego(bidId, file) {
    if (!file) return;
    
    document.getElementById('bid-analyze-status').classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const result = await apiCall(`/bids/${bidId}/analyze`, { method: 'POST', body: formData });
        showToast(`Pliego analizado. ${result.checklist_items_created} items de checklist creados.`, 'success');
        showBidDetail(bidId); // Refresh
    } catch (err) {
        document.getElementById('bid-analyze-status').classList.add('hidden');
        showToast('Error analizando: ' + err.message, 'error');
    }
}

async function toggleChecklistStatus(bidId, itemId, currentStatus) {
    const nextStatus = { pendiente: 'tiene', tiene: 'falta', falta: 'pendiente', vencido: 'tiene' };
    const newStatus = nextStatus[currentStatus] || 'tiene';
    
    try {
        await apiCall(`/bids/${bidId}/checklist/${itemId}?status=${newStatus}`, { method: 'PUT' });
        showBidDetail(bidId);
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function updateBidStatus(id, newStatus) {
    try {
        await apiCall(`/bids/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        showToast('Estado actualizado', 'success');
        closeModal();
        loadBidsList();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}
