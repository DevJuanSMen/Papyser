/* ── Dashboard Page ── */
async function renderDashboard(container) {
    container.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
    
    try {
        const data = await apiCall('/dashboard/stats');
        const stats = data;
        
        const totalAlerts = (stats.alerts?.urgent_bids?.length || 0) + (stats.alerts?.urgent_purchases?.length || 0);
        
        // Update notification badge
        const badge = document.getElementById('notification-badge');
        if (totalAlerts > 0) {
            badge.textContent = totalAlerts;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        container.innerHTML = `
            <div class="fade-in">
                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card purple">
                        <div class="stat-card-header">
                            <div class="stat-card-icon"><i data-lucide="shopping-cart"></i></div>
                        </div>
                        <div class="stat-card-value">${stats.purchases?.total || 0}</div>
                        <div class="stat-card-label">Compras Activas</div>
                    </div>
                    <div class="stat-card cyan">
                        <div class="stat-card-header">
                            <div class="stat-card-icon"><i data-lucide="scroll-text"></i></div>
                        </div>
                        <div class="stat-card-value">${stats.bids?.total || 0}</div>
                        <div class="stat-card-label">Licitaciones</div>
                    </div>
                    <div class="stat-card green">
                        <div class="stat-card-header">
                            <div class="stat-card-icon"><i data-lucide="file-check"></i></div>
                        </div>
                        <div class="stat-card-value">${stats.documents_processed || 0}</div>
                        <div class="stat-card-label">Documentos Procesados</div>
                    </div>
                    <div class="stat-card amber">
                        <div class="stat-card-header">
                            <div class="stat-card-icon"><i data-lucide="building-2"></i></div>
                        </div>
                        <div class="stat-card-value">${stats.active_suppliers || 0}</div>
                        <div class="stat-card-label">Proveedores Activos</div>
                    </div>
                </div>
                
                <div class="content-grid">
                    <!-- Alerts -->
                    <div>
                        <div class="section-header"><h3>⚠️ Alertas Activas</h3></div>
                        <div class="alerts-panel">
                            ${renderAlerts(stats.alerts)}
                        </div>
                    </div>
                    
                    <!-- Status Breakdown -->
                    <div>
                        <div class="section-header"><h3>📊 Estado de Procesos</h3></div>
                        <div class="alerts-panel">
                            <h4 style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px;">Compras</h4>
                            ${renderStatusBreakdown(stats.purchases?.by_status || {})}
                            <h4 style="font-size:0.85rem;color:var(--text-secondary);margin:16px 0 12px;">Licitaciones</h4>
                            ${renderStatusBreakdown(stats.bids?.by_status || {})}
                        </div>
                    </div>
                </div>
                
                <!-- Activity -->
                <div style="margin-top:20px;">
                    <div class="section-header"><h3>🕐 Actividad Reciente</h3></div>
                    <div class="alerts-panel" id="activity-container">
                        <div class="page-loader"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        `;
        
        lucide.createIcons({ nodes: [container] });
        loadActivity();
        
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error cargando dashboard</h3><p>${err.message}</p></div>`;
    }
}

function renderAlerts(alerts) {
    if (!alerts) return '<p style="color:var(--text-muted);font-size:0.85rem;">Sin alertas</p>';
    
    let html = '';
    
    if (alerts.urgent_bids?.length > 0) {
        alerts.urgent_bids.forEach(bid => {
            html += `
                <div class="alert-item" onclick="navigate('bids')" style="cursor:pointer;">
                    <div class="alert-dot red"></div>
                    <div class="alert-content">
                        <div class="alert-title">${bid.code} — ${bid.title}</div>
                        <div class="alert-sub">Cierre: ${formatDate(bid.close_date)} · ${statusLabel(bid.status)}</div>
                    </div>
                </div>`;
        });
    }
    
    if (alerts.urgent_purchases?.length > 0) {
        alerts.urgent_purchases.forEach(p => {
            html += `
                <div class="alert-item" onclick="navigate('purchases')" style="cursor:pointer;">
                    <div class="alert-dot amber"></div>
                    <div class="alert-content">
                        <div class="alert-title">${p.code} — ${p.title}</div>
                        <div class="alert-sub">Urgencia: ${p.urgency} · ${statusLabel(p.status)}</div>
                    </div>
                </div>`;
        });
    }
    
    return html || '<p style="color:var(--text-muted);font-size:0.85rem;">✅ Sin alertas pendientes</p>';
}

function renderStatusBreakdown(statusMap) {
    if (Object.keys(statusMap).length === 0) return '<p style="color:var(--text-muted);font-size:0.85rem;">Sin datos</p>';
    
    return Object.entries(statusMap).map(([status, count]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;">
            <span class="badge ${status}">${statusLabel(status)}</span>
            <span style="font-weight:600;font-size:0.9rem;">${count}</span>
        </div>
    `).join('');
}

async function loadActivity() {
    try {
        const data = await apiCall('/dashboard/activity');
        const container = document.getElementById('activity-container');
        
        if (!data.activities || data.activities.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Sin actividad registrada</p>';
            return;
        }
        
        container.innerHTML = `<div class="timeline">
            ${data.activities.slice(0, 10).map(a => `
                <div class="timeline-item">
                    <div class="timeline-dot"><i data-lucide="activity"></i></div>
                    <div class="timeline-content">
                        <div class="timeline-action"><strong>${a.user_name || 'Sistema'}</strong> ${a.action}</div>
                        <div class="timeline-meta">${a.details || ''} · ${formatDate(a.created_at)}</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
        
        lucide.createIcons({ nodes: [container] });
    } catch {
        document.getElementById('activity-container').innerHTML = '<p style="color:var(--text-muted);">Error cargando actividad</p>';
    }
}
