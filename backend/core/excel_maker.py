import io
import pandas as pd
from typing import Dict, Any

def generate_excel(invoice_data: Dict[str, Any]) -> io.BytesIO:
    """
    Toma un diccionario de factura validado (similar a InvoiceResponse),
    y genera un archivo Excel en memoria.
    """
    
    # Datos generales
    general_info = {
        "Proveedor": invoice_data.get("proveedor", ""),
        "NIT": invoice_data.get("nit", ""),
        "Número de Factura": invoice_data.get("numero_factura", ""),
        "Fecha": invoice_data.get("fecha", ""),
        "Subtotal": invoice_data.get("subtotal", 0.0),
        "Impuestos": invoice_data.get("impuestos", 0.0),
        "Total": invoice_data.get("total", 0.0),
    }
    
    # Crear un writer de Pandas en memoria
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        
        # 1. Hoja de Resumen (Datos principales)
        df_resumen = pd.DataFrame([general_info])
        df_resumen.to_excel(writer, sheet_name="Resumen", index=False)
        
        # 2. Hoja de Items
        items = invoice_data.get("items", [])
        if items:
            df_items = pd.DataFrame(items)
            # Renombrar columnas para que queden bonitas
            df_items.rename(columns={
                "descripcion": "Descripción",
                "cantidad": "Cantidad",
                "precio_unitario": "Precio Unitario",
                "total_item": "Total"
            }, inplace=True)
            df_items.to_excel(writer, sheet_name="Items", index=False)
        else:
            pd.DataFrame({"Mensaje": ["No se detectaron items"]}).to_excel(writer, sheet_name="Items", index=False)
            
    # Mover el puntero de bytes al inicio
    output.seek(0)
    return output
