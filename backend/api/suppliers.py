"""
Suppliers (Proveedores) API Routes.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from backend.database.db import get_db
from backend.core.auth_utils import get_current_user

router = APIRouter()

class SupplierCreate(BaseModel):
    name: str
    nit: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    nit: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = None

@router.get("")
async def list_suppliers(request: Request, category: Optional[str] = None):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    query = "SELECT * FROM suppliers WHERE is_active = 1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    query += " ORDER BY score DESC, name ASC"
    
    c.execute(query, params)
    suppliers = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"suppliers": suppliers}

@router.post("")
async def create_supplier(data: SupplierCreate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("""
        INSERT INTO suppliers (name, nit, contact_name, email, phone, address, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (data.name, data.nit, data.contact_name, data.email, data.phone, data.address, data.category))
    
    supplier_id = c.lastrowid
    
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Registró proveedor", "supplier", supplier_id, data.name))
    
    conn.commit()
    conn.close()
    return {"id": supplier_id, "message": "Proveedor creado"}

@router.get("/{supplier_id}")
async def get_supplier(supplier_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
    supplier = c.fetchone()
    if not supplier:
        conn.close()
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Historial de cotizaciones
    c.execute("""
        SELECT q.*, p.code as purchase_code, p.title as purchase_title 
        FROM quotations q 
        LEFT JOIN purchases p ON q.purchase_id = p.id 
        WHERE q.supplier_id = ? OR q.supplier_name = ?
        ORDER BY q.created_at DESC
    """, (supplier_id, supplier["name"]))
    quotation_history = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return {"supplier": dict(supplier), "quotation_history": quotation_history}

@router.put("/{supplier_id}")
async def update_supplier(supplier_id: int, data: SupplierUpdate, request: Request):
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
    
    params.append(supplier_id)
    c.execute(f"UPDATE suppliers SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    return {"message": "Proveedor actualizado"}
