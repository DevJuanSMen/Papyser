from pydantic import BaseModel, Field
from typing import List, Optional

class InvoiceItem(BaseModel):
    descripcion: str = Field(description="Descripción del producto o servicio")
    cantidad: float = Field(description="Cantidad")
    precio_unitario: float = Field(description="Precio por unidad")
    total_item: float = Field(description="Total por este item")

class InvoiceResponse(BaseModel):
    proveedor: Optional[str] = Field(description="Nombre del proveedor o tienda")
    nit: Optional[str] = Field(description="NIT o identificador fiscal")
    numero_factura: Optional[str] = Field(description="Número de la factura")
    fecha: Optional[str] = Field(description="Fecha de emisión en formato YYYY-MM-DD")
    subtotal: Optional[float] = Field(description="Subtotal antes de impuestos")
    impuestos: Optional[float] = Field(description="Total de impuestos")
    total: Optional[float] = Field(description="Total a pagar de la factura")
    items: List[InvoiceItem] = Field(default_factory=list, description="Lista de items facturados")
