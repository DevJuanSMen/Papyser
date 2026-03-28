"""
Purchases (Compras) API Routes — CRUD + Cotizaciones + Comparador.
"""
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from backend.database.db import get_db
from backend.core.auth_utils import get_current_user

router = APIRouter()

class PurchaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    requesting_area: Optional[str] = None
    product_service: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    urgency: Optional[str] = "media"
    cost_center: Optional[str] = None
    required_date: Optional[str] = None
    estimated_budget: Optional[float] = None

class PurchaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requesting_area: Optional[str] = None
    product_service: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    urgency: Optional[str] = None
    cost_center: Optional[str] = None
    required_date: Optional[str] = None
    estimated_budget: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class QuotationCreate(BaseModel):
    supplier_name: str
    supplier_id: Optional[int] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    delivery_days: Optional[int] = None
    payment_terms: Optional[str] = None
    warranty: Optional[str] = None
    validity_date: Optional[str] = None
    notes: Optional[str] = None

def _generate_code(cursor):
    year = datetime.now().year
    cursor.execute("SELECT COUNT(*) as c FROM purchases WHERE code LIKE ?", (f"SC-{year}-%",))
    count = cursor.fetchone()["c"] + 1
    return f"SC-{year}-{count:03d}"

@router.get("")
async def list_purchases(request: Request, status: Optional[str] = None):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    query = "SELECT * FROM purchases"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    
    c.execute(query, params)
    purchases = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"purchases": purchases}

@router.post("")
async def create_purchase(data: PurchaseCreate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    code = _generate_code(c)
    
    c.execute("""
        INSERT INTO purchases (code, title, description, requesting_area, product_service, 
        quantity, unit, urgency, cost_center, required_date, estimated_budget, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (code, data.title, data.description, data.requesting_area, data.product_service,
          data.quantity, data.unit, data.urgency, data.cost_center, data.required_date,
          data.estimated_budget, user["user_id"]))
    
    purchase_id = c.lastrowid
    
    # Log activity
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Creó solicitud de compra", "purchase", purchase_id, f"{code} - {data.title}"))
    
    conn.commit()
    conn.close()
    return {"id": purchase_id, "code": code, "message": "Solicitud creada exitosamente"}

@router.get("/{purchase_id}")
async def get_purchase(purchase_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM purchases WHERE id = ?", (purchase_id,))
    purchase = c.fetchone()
    if not purchase:
        conn.close()
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    # Obtener cotizaciones asociadas
    c.execute("SELECT * FROM quotations WHERE purchase_id = ? ORDER BY total_price ASC", (purchase_id,))
    quotations = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return {"purchase": dict(purchase), "quotations": quotations}

@router.put("/{purchase_id}")
async def update_purchase(purchase_id: int, data: PurchaseUpdate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    updates = []
    params = []
    for field, value in data.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        params.append(value)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(purchase_id)
    
    c.execute(f"UPDATE purchases SET {', '.join(updates)} WHERE id = ?", params)
    
    # Si se aprueba
    if data.status == "aprobacion":
        c.execute("UPDATE purchases SET approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?",
                  (user["user_id"], purchase_id))
    
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Actualizó solicitud de compra", "purchase", purchase_id, 
          f"Campos: {', '.join(data.model_dump(exclude_none=True).keys())}"))
    
    conn.commit()
    conn.close()
    return {"message": "Solicitud actualizada"}

@router.post("/{purchase_id}/quotations")
async def add_quotation(purchase_id: int, data: QuotationCreate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("""
        INSERT INTO quotations (purchase_id, supplier_id, supplier_name, unit_price, total_price,
        delivery_days, payment_terms, warranty, validity_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (purchase_id, data.supplier_id, data.supplier_name, data.unit_price, data.total_price,
          data.delivery_days, data.payment_terms, data.warranty, data.validity_date, data.notes))
    
    # Actualizar estado a cotización si está en nueva
    c.execute("UPDATE purchases SET status = 'cotizacion', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'nueva'",
              (purchase_id,))
    
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Agregó cotización", "purchase", purchase_id, f"Proveedor: {data.supplier_name}"))
    
    conn.commit()
    conn.close()
    return {"message": "Cotización agregada"}

@router.get("/{purchase_id}/compare")
async def compare_quotations(purchase_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM quotations WHERE purchase_id = ?", (purchase_id,))
    quotations = [dict(row) for row in c.fetchall()]
    conn.close()
    
    if len(quotations) < 2:
        return {"comparison": None, "message": "Se necesitan al menos 2 cotizaciones para comparar", "quotations": quotations}
    
    # Ordenar por criterios
    by_price = sorted(quotations, key=lambda q: q["total_price"] or float('inf'))
    by_delivery = sorted(quotations, key=lambda q: q["delivery_days"] or float('inf'))
    
    return {
        "quotations": quotations,
        "comparison": {
            "best_price": by_price[0] if by_price else None,
            "fastest_delivery": by_delivery[0] if by_delivery else None,
            "total_quotations": len(quotations)
        }
    }
