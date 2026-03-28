/* ── Settings (Configuración) Page ── */
async function renderSettings(container) {
    if (currentUser?.role !== 'admin') {
        container.innerHTML = `<div class="empty-state">
            <i data-lucide="shield-alert"></i>
            <h3>Acceso restringido</h3>
            <p>Solo los administradores pueden acceder a la configuración</p>
        </div>`;
        lucide.createIcons({ nodes: [container] });
        return;
    }
    
    container.innerHTML = `
        <div class="fade-in">
            <div class="section-header"><h3>⚙️ Configuración del Sistema</h3></div>
            
            <div class="content-grid">
                <div>
                    <div class="alerts-panel">
                        <h4 style="font-size:0.95rem;margin-bottom:16px;">👤 Usuarios del Sistema</h4>
                        <div id="settings-users-list">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <div class="alerts-panel">
                        <h4 style="font-size:0.95rem;margin-bottom:16px;">📋 Reglas de Negocio</h4>
                        <div id="settings-rules">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>
                    
                    <div class="alerts-panel" style="margin-top:16px;">
                        <h4 style="font-size:0.95rem;margin-bottom:16px;">🔗 Información del Sistema</h4>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                                <span style="color:var(--text-muted);">Versión</span>
                                <span>2.0.0 MVP</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                                <span style="color:var(--text-muted);">Motor IA</span>
                                <span>Gemini 2.5 Flash</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                                <span style="color:var(--text-muted);">Base de Datos</span>
                                <span>SQLite (MVP)</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
                                <span style="color:var(--text-muted);">Backend</span>
                                <span>FastAPI</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons({ nodes: [container] });
    loadSettingsData();
}

async function loadSettingsData() {
    // Load users info from dashboard (basic)
    try {
        const usersEl = document.getElementById('settings-users-list');
        // We don't have a users endpoint yet, so show the seeded users info
        usersEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;">
                ${[
                    { name: 'Carlos Administrador', role: 'admin', user: 'admin' },
                    { name: 'María Compradora', role: 'comprador', user: 'comprador' },
                    { name: 'Andrés Licitador', role: 'licitador', user: 'licitador' },
                    { name: 'Laura Visualizadora', role: 'visualizador', user: 'viewer' }
                ].map(u => `
                    <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                        <div class="user-avatar" style="width:32px;height:32px;font-size:0.7rem;">${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
                        <div style="flex:1;">
                            <div style="font-size:0.85rem;font-weight:500;">${u.name}</div>
                            <div style="font-size:0.7rem;color:var(--text-muted);">@${u.user} · ${u.role}</div>
                        </div>
                        <span class="badge ${u.role === 'admin' ? 'nueva' : u.role === 'comprador' ? 'cotizacion' : u.role === 'licitador' ? 'viable' : 'cerrada'}">${u.role}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch {}
    
    // Show current settings
    try {
        const rulesEl = document.getElementById('settings-rules');
        rulesEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div>
                        <div style="font-size:0.85rem;font-weight:500;">Cotizaciones mínimas</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Mínimo para comparar</div>
                    </div>
                    <span style="font-weight:700;color:var(--accent-primary);">3</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div>
                        <div style="font-size:0.85rem;font-weight:500;">Monto aprobación</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Requiere aprobación superior</div>
                    </div>
                    <span style="font-weight:700;color:var(--warning);">$5.000.000</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div>
                        <div style="font-size:0.85rem;font-weight:500;">Score viabilidad mínimo</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Para considerar viable</div>
                    </div>
                    <span style="font-weight:700;color:var(--success);">60%</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div>
                        <div style="font-size:0.85rem;font-weight:500;">Alertas anticipadas</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">Días antes de vencimiento</div>
                    </div>
                    <span style="font-weight:700;color:var(--danger);">3 días</span>
                </div>
            </div>
        `;
    } catch {}
}
