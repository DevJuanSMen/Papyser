"""
Dashboard API Routes — KPIs, actividad reciente, alertas.
"""
from fastapi import APIRouter, Request
from backend.database.db import get_db
from backend.core.auth_utils import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_stats(request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    # Compras por estado
    c.execute("SELECT status, COUNT(*) as count FROM purchases GROUP BY status")
    purchase_stats = {row["status"]: row["count"] for row in c.fetchall()}
    
    # Licitaciones por estado
    c.execute("SELECT status, COUNT(*) as count FROM bids GROUP BY status")
    bid_stats = {row["status"]: row["count"] for row in c.fetchall()}
    
    # Documentos procesados
    c.execute("SELECT COUNT(*) as count FROM documents")
    docs_count = c.fetchone()["count"]
    
    # Proveedores activos
    c.execute("SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1")
    suppliers_count = c.fetchone()["count"]
    
    # Totales
    c.execute("SELECT COUNT(*) as count FROM purchases")
    total_purchases = c.fetchone()["count"]
    c.execute("SELECT COUNT(*) as count FROM bids")
    total_bids = c.fetchone()["count"]
    
    # Alertas: licitaciones con cierre próximo (5 días)
    c.execute("""
        SELECT id, code, title, close_date, status FROM bids 
        WHERE close_date IS NOT NULL AND close_date != '' 
        AND date(close_date) <= date('now', '+5 days')
        AND status NOT IN ('adjudicada', 'no_adjudicada', 'cancelada')
        ORDER BY close_date ASC LIMIT 10
    """)
    urgent_bids = [dict(row) for row in c.fetchall()]
    
    # Compras urgentes
    c.execute("""
        SELECT id, code, title, urgency, status FROM purchases 
        WHERE urgency IN ('alta', 'critica') 
        AND status NOT IN ('cerrada', 'cancelada')
        LIMIT 10
    """)
    urgent_purchases = [dict(row) for row in c.fetchall()]
    
    conn.close()
    
    return {
        "purchases": {
            "total": total_purchases,
            "by_status": purchase_stats
        },
        "bids": {
            "total": total_bids,
            "by_status": bid_stats
        },
        "documents_processed": docs_count,
        "active_suppliers": suppliers_count,
        "alerts": {
            "urgent_bids": urgent_bids,
            "urgent_purchases": urgent_purchases
        }
    }

@router.get("/activity")
async def get_activity(request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT al.*, u.full_name as user_name 
        FROM activity_log al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC LIMIT 20
    """)
    activities = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"activities": activities}
