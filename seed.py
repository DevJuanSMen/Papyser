"""
Seed script — Crea usuarios de prueba para cada rol.
Ejecutar: python seed.py
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import init_db, get_db
from backend.core.auth_utils import hash_password

SEED_USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "full_name": "Carlos Administrador",
        "email": "admin@papyser.com",
        "role": "admin"
    },
    {
        "username": "comprador",
        "password": "comprador123",
        "full_name": "María Compradora",
        "email": "compras@papyser.com",
        "role": "comprador"
    },
    {
        "username": "licitador",
        "password": "licitador123",
        "full_name": "Andrés Licitador",
        "email": "licitaciones@papyser.com",
        "role": "licitador"
    },
    {
        "username": "viewer",
        "password": "viewer123",
        "full_name": "Laura Visualizadora",
        "email": "reportes@papyser.com",
        "role": "visualizador"
    }
]

SEED_SUPPLIERS = [
    {
        "name": "Distribuidora Nacional S.A.S",
        "nit": "900123456-1",
        "contact_name": "Juan Pérez",
        "email": "ventas@distnacional.com",
        "phone": "601-555-0101",
        "category": "suministros",
        "score": 4.2
    },
    {
        "name": "TecnoSoluciones Ltda",
        "nit": "800987654-2",
        "contact_name": "Ana García",
        "email": "comercial@tecnosoluciones.co",
        "phone": "601-555-0202",
        "category": "tecnologia",
        "score": 3.8
    },
    {
        "name": "Papelería Industrial Colombia",
        "nit": "901456789-3",
        "contact_name": "Roberto Ramírez",
        "email": "ventas@papelindustrial.com",
        "phone": "601-555-0303",
        "category": "papeleria",
        "score": 4.5
    },
    {
        "name": "Servicios Integrales del Norte",
        "nit": "860321654-7",
        "contact_name": "Diana Torres",
        "email": "info@sinorte.com",
        "phone": "601-555-0404",
        "category": "servicios",
        "score": 3.5
    }
]

SEED_SETTINGS = [
    ("min_quotations", "3", "Número mínimo de cotizaciones para comparar"),
    ("approval_threshold", "5000000", "Monto que requiere aprobación superior (COP)"),
    ("bid_viability_min_score", "60", "Score mínimo para considerar viable una licitación"),
    ("alert_days_before", "3", "Días de anticipación para alertas de vencimiento"),
    ("company_name", "Papyser", "Nombre de la empresa"),
]

def seed():
    """Ejecutar seed completo."""
    print("🌱 Iniciando seed de la base de datos...")
    
    # 1. Inicializar tablas
    init_db()
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 2. Insertar usuarios
    print("\n👤 Creando usuarios...")
    for user in SEED_USERS:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO users (username, password_hash, full_name, email, role)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user["username"],
                hash_password(user["password"]),
                user["full_name"],
                user["email"],
                user["role"]
            ))
            print(f"   ✅ {user['role']:15s} → usuario: {user['username']:12s} | clave: {user['password']}")
        except Exception as e:
            print(f"   ⚠️  Error creando {user['username']}: {e}")
    
    # 3. Insertar proveedores
    print("\n🏢 Creando proveedores...")
    for supplier in SEED_SUPPLIERS:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO suppliers (name, nit, contact_name, email, phone, category, score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                supplier["name"],
                supplier["nit"],
                supplier["contact_name"],
                supplier["email"],
                supplier["phone"],
                supplier["category"],
                supplier["score"]
            ))
            print(f"   ✅ {supplier['name']}")
        except Exception as e:
            print(f"   ⚠️  Error creando proveedor: {e}")
    
    # 4. Insertar configuraciones
    print("\n⚙️  Creando configuraciones...")
    for key, value, desc in SEED_SETTINGS:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO settings (key, value, description)
                VALUES (?, ?, ?)
            """, (key, value, desc))
            print(f"   ✅ {key} = {value}")
        except Exception as e:
            print(f"   ⚠️  Error en setting {key}: {e}")
    
    # 5. Insertar datos demo de compras
    print("\n🛒 Creando compras de ejemplo...")
    demo_purchases = [
        ("SC-2026-001", "Resmas de papel carta", "Compra de 200 resmas de papel carta para oficinas", "Administrativa", "Papel carta", 200, "resmas", "media", "ADM-001", "2026-04-15", 1800000, "nueva"),
        ("SC-2026-002", "Tóner para impresoras", "Reposición de tóner para 15 impresoras", "TI", "Tóner HP", 15, "unidades", "alta", "TI-002", "2026-04-05", 3500000, "cotizacion"),
        ("SC-2026-003", "Equipos de cómputo portátil", "Compra de laptops para nuevos empleados", "Recursos Humanos", "Laptop Dell Latitude", 5, "unidades", "critica", "RRHH-003", "2026-04-20", 25000000, "aprobacion"),
    ]
    for p in demo_purchases:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO purchases (code, title, description, requesting_area, product_service, quantity, unit, urgency, cost_center, required_date, estimated_budget, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, p)
            print(f"   ✅ {p[0]} — {p[1]}")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
    
    # 6. Insertar datos demo de licitaciones
    print("\n📑 Creando licitaciones de ejemplo...")
    demo_bids = [
        ("LIC-2026-001", "Suministro de papelería para MinEducación", "Ministerio de Educación", "Suministro integral de papelería y útiles de oficina para sedes a nivel nacional", 450000000, "SECOP II", "2026-04-10", "analisis", 72, "medio"),
        ("LIC-2026-002", "Dotación tecnológica Alcaldía Bogotá", "Alcaldía Mayor de Bogotá", "Dotación de equipos de cómputo e impresoras para dependencias", 1200000000, "SECOP II", "2026-04-25", "documentacion", 85, "bajo"),
        ("LIC-2026-003", "Papelería DIAN - Sede Nacional", "DIAN", "Contrato de suministro de papelería por 12 meses", 280000000, "SECOP I", "2026-04-03", "viable", 65, "alto"),
    ]
    for b in demo_bids:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO bids (code, title, entity, object_description, budget, source_platform, close_date, status, viability_score, risk_level, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, b)
            print(f"   ✅ {b[0]} — {b[1]}")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
    
    conn.commit()
    conn.close()
    
    print("\n" + "="*60)
    print("🎉 Seed completado exitosamente!")
    print("="*60)
    print("\n📋 Credenciales de acceso:")
    print("-"*50)
    for user in SEED_USERS:
        print(f"   {user['role']:15s} → {user['username']} / {user['password']}")
    print("-"*50)

if __name__ == "__main__":
    seed()
