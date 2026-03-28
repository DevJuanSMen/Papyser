"""
SQLite Database Connection & Initialization.
Migratable a PostgreSQL reemplazando la conexión y queries.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "papyser.db")

def get_db():
    """Obtener conexión a SQLite con row_factory para dict-like access."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Crear todas las tablas si no existen."""
    conn = get_db()
    cursor = conn.cursor()
    
    # ── Users ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT,
            role TEXT NOT NULL CHECK(role IN ('admin', 'comprador', 'licitador', 'visualizador')),
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Documents (procesados por IA) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_path TEXT,
            mime_type TEXT,
            doc_type TEXT CHECK(doc_type IN ('cotizacion', 'factura', 'pliego', 'anexo_tecnico', 'certificacion', 'orden_compra', 'poliza', 'otro')),
            extracted_data TEXT,
            classification_confidence REAL,
            uploaded_by INTEGER REFERENCES users(id),
            related_purchase_id INTEGER REFERENCES purchases(id),
            related_bid_id INTEGER REFERENCES bids(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Suppliers (Proveedores) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            nit TEXT UNIQUE,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            category TEXT,
            score REAL DEFAULT 0,
            total_orders INTEGER DEFAULT 0,
            on_time_deliveries INTEGER DEFAULT 0,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Purchases (Solicitudes de Compra) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            title TEXT NOT NULL,
            description TEXT,
            requesting_area TEXT,
            product_service TEXT NOT NULL,
            quantity REAL,
            unit TEXT,
            urgency TEXT CHECK(urgency IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
            cost_center TEXT,
            required_date TEXT,
            estimated_budget REAL,
            status TEXT CHECK(status IN ('nueva', 'cotizacion', 'comparacion', 'aprobacion', 'orden_compra', 'entregada', 'cerrada', 'cancelada')) DEFAULT 'nueva',
            approved_by INTEGER REFERENCES users(id),
            approved_at TIMESTAMP,
            selected_supplier_id INTEGER REFERENCES suppliers(id),
            total_amount REAL,
            notes TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Quotations (Cotizaciones de Proveedores) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL REFERENCES purchases(id),
            supplier_id INTEGER REFERENCES suppliers(id),
            supplier_name TEXT,
            document_id INTEGER REFERENCES documents(id),
            unit_price REAL,
            total_price REAL,
            delivery_days INTEGER,
            payment_terms TEXT,
            warranty TEXT,
            validity_date TEXT,
            extracted_data TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Bids (Licitaciones/Oportunidades) ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            title TEXT NOT NULL,
            entity TEXT,
            object_description TEXT,
            budget REAL,
            source_platform TEXT,
            close_date TEXT,
            observation_deadline TEXT,
            award_date TEXT,
            status TEXT CHECK(status IN ('detectada', 'analisis', 'viable', 'no_viable', 'documentacion', 'elaboracion', 'presentada', 'subsanacion', 'adjudicada', 'no_adjudicada', 'cancelada')) DEFAULT 'detectada',
            viability_score REAL,
            risk_level TEXT CHECK(risk_level IN ('bajo', 'medio', 'alto')) DEFAULT 'medio',
            ai_summary TEXT,
            ai_risks TEXT,
            requirements TEXT,
            required_documents TEXT,
            assigned_to INTEGER REFERENCES users(id),
            notes TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Bid Checklist Items ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bid_checklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bid_id INTEGER NOT NULL REFERENCES bids(id),
            document_name TEXT NOT NULL,
            responsible_area TEXT,
            status TEXT CHECK(status IN ('pendiente', 'tiene', 'falta', 'vencido')) DEFAULT 'pendiente',
            due_date TEXT,
            document_id INTEGER REFERENCES documents(id),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Activity Log ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # ── Settings ──
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"✅ Base de datos inicializada en: {DB_PATH}")

if __name__ == "__main__":
    init_db()
