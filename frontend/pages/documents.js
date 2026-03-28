/* ── Documents (IA Documental) Page ── */
async function renderDocuments(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="section-header">
                <h3>📄 IA Documental</h3>
                <button class="btn btn-primary" onclick="showUploadModal()">
                    <i data-lucide="upload"></i> Procesar Documento
                </button>
            </div>
            
            <div class="alerts-panel" style="margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <i data-lucide="sparkles" style="color:var(--accent-primary);"></i>
                    <div>
                        <strong>Motor de IA Documental</strong>
                        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:2px;">
                            Sube cualquier documento (PDF, imagen) y la IA lo clasifica automáticamente y extrae datos clave.
                        </p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <span class="badge tipo-cotizacion">Cotizaciones</span>
                    <span class="badge tipo-factura">Facturas</span>
                    <span class="badge tipo-pliego">Pliegos</span>
                    <span class="badge tipo-otro">Certificaciones</span>
                    <span class="badge tipo-otro">Anexos Técnicos</span>
                </div>
            </div>
            
            <div class="data-table-container" id="documents-table-container">
                <div class="data-table-header">
                    <h3>Historial de Documentos Procesados</h3>
                </div>
                <div id="documents-list">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons({ nodes: [container] });
    loadDocumentsList();
}

async function loadDocumentsList() {
    try {
        const data = await apiCall('/documents');
        const listEl = document.getElementById('documents-list');
        
        if (!data.documents || data.documents.length === 0) {
            listEl.innerHTML = `<div class="empty-state">
                <i data-lucide="file-search"></i>
                <h3>Sin documentos procesados</h3>
                <p>Sube tu primer documento para que la IA lo analice</p>
            </div>`;
            lucide.createIcons({ nodes: [listEl] });
            return;
        }
        
        listEl.innerHTML = `<table class="data-table">
            <thead><tr>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Confianza</th>
                <th>Subido por</th>
                <th>Fecha</th>
            </tr></thead>
            <tbody>
                ${data.documents.map(doc => `
                    <tr onclick="showDocumentDetail(${doc.id})">
                        <td>${doc.filename || '-'}</td>
                        <td><span class="badge tipo-${doc.doc_type || 'otro'}">${doc.doc_type || 'otro'}</span></td>
                        <td>${doc.classification_confidence ? (doc.classification_confidence * 100).toFixed(0) + '%' : '-'}</td>
                        <td>${doc.uploaded_by_name || '-'}</td>
                        <td>${formatDate(doc.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
        
        lucide.createIcons({ nodes: [listEl] });
    } catch (err) {
        document.getElementById('documents-list').innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

function showUploadModal() {
    openModal('Procesar Documento con IA', `
        <div class="dropzone" id="modal-dropzone" onclick="document.getElementById('modal-file-input').click()">
            <input type="file" id="modal-file-input" accept=".pdf,image/jpeg,image/png,image/webp" hidden>
            <i data-lucide="cloud-upload" class="upload-icon"></i>
            <h3>Arrastra tu documento aquí</h3>
            <p>PDF, JPG, PNG — La IA clasificará y extraerá datos automáticamente</p>
        </div>
        <div id="upload-status" class="hidden" style="text-align:center;padding:30px;">
            <div class="spinner" style="margin:0 auto 16px;"></div>
            <p>La IA está analizando el documento...</p>
        </div>
        <div id="upload-result" class="hidden"></div>
    `, '');
    
    const fileInput = document.getElementById('modal-file-input');
    const dropzone = document.getElementById('modal-dropzone');
    
    fileInput.addEventListener('change', (e) => processUpload(e.target.files[0]));
    
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); processUpload(e.dataTransfer.files[0]); });
}

async function processUpload(file) {
    if (!file) return;
    
    document.getElementById('modal-dropzone').classList.add('hidden');
    document.getElementById('upload-status').classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const result = await apiCall('/documents/upload', { method: 'POST', body: formData });
        
        document.getElementById('upload-status').classList.add('hidden');
        const resultEl = document.getElementById('upload-result');
        resultEl.classList.remove('hidden');
        
        resultEl.innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <i data-lucide="check-circle" style="width:48px;height:48px;color:var(--success);margin-bottom:12px;"></i>
                <h3>Documento Procesado</h3>
                <p style="color:var(--text-muted);margin-top:4px;">${file.name}</p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div style="padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div style="font-size:0.75rem;color:var(--text-muted);">Tipo Detectado</div>
                    <div style="font-weight:600;margin-top:4px;"><span class="badge tipo-${result.doc_type}">${result.doc_type}</span></div>
                </div>
                <div style="padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);">
                    <div style="font-size:0.75rem;color:var(--text-muted);">Confianza IA</div>
                    <div style="font-weight:600;margin-top:4px;">${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : '-'}</div>
                </div>
            </div>
            ${result.summary ? `<p style="color:var(--text-secondary);font-size:0.85rem;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm);">${result.summary}</p>` : ''}
            <div style="margin-top:16px;">
                <details>
                    <summary style="cursor:pointer;color:var(--accent-primary);font-size:0.85rem;">Ver datos extraídos (JSON)</summary>
                    <pre style="background:var(--bg-glass);padding:12px;border-radius:var(--radius-sm);overflow-x:auto;font-size:0.8rem;margin-top:8px;max-height:300px;overflow-y:auto;">${JSON.stringify(result.extracted_data, null, 2)}</pre>
                </details>
            </div>
        `;
        
        lucide.createIcons({ nodes: [resultEl] });
        showToast('Documento procesado exitosamente', 'success');
        loadDocumentsList();
        
    } catch (err) {
        document.getElementById('upload-status').classList.add('hidden');
        document.getElementById('modal-dropzone').classList.remove('hidden');
        showToast('Error: ' + err.message, 'error');
    }
}

async function showDocumentDetail(docId) {
    try {
        const doc = await apiCall(`/documents/${docId}`);
        let extractedData = doc.extracted_data;
        if (typeof extractedData === 'string') {
            try { extractedData = JSON.parse(extractedData); } catch {}
        }
        
        openModal(`Documento #${doc.id}`, `
            <div class="form-grid">
                <div class="form-group"><label>Archivo</label><p>${doc.filename}</p></div>
                <div class="form-group"><label>Tipo</label><span class="badge tipo-${doc.doc_type}">${doc.doc_type}</span></div>
                <div class="form-group"><label>Confianza</label><p>${doc.classification_confidence ? (doc.classification_confidence * 100).toFixed(0) + '%' : '-'}</p></div>
                <div class="form-group"><label>Fecha</label><p>${formatDate(doc.created_at)}</p></div>
            </div>
            <div style="margin-top:18px;">
                <label style="font-size:0.8rem;font-weight:500;color:var(--text-secondary);">Datos Extraídos</label>
                <pre style="background:var(--bg-glass);padding:14px;border-radius:var(--radius-sm);overflow-x:auto;font-size:0.8rem;margin-top:6px;max-height:400px;overflow-y:auto;">${JSON.stringify(extractedData, null, 2)}</pre>
            </div>
        `, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}
