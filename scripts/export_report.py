"""
Exportar reporte de stock actual a CSV.

Uso:
    1. Crea un archivo .env en la carpeta scripts/ con:
       SUPABASE_URL=https://tu-proyecto.supabase.co
       SUPABASE_SERVICE_KEY=tu-service-role-key

    2. Ejecuta: python export_report.py [nombre_archivo.csv]
"""

import csv
import sys
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en el archivo .env")
        sys.exit(1)

    output_file = sys.argv[1] if len(sys.argv) > 1 else f"stock_report_{datetime.now():%Y%m%d_%H%M%S}.csv"

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    result = client.table("products").select("*").order("reference").execute()
    products = result.data

    if not products:
        print("No hay productos en la base de datos.")
        sys.exit(0)

    fields = ["reference", "name", "category", "material", "price", "stock_quantity"]

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(products)

    print(f"Reporte exportado: {output_file}")
    print(f"Total productos: {len(products)}")

    low_stock = [p for p in products if p["stock_quantity"] <= 3]
    out_of_stock = [p for p in products if p["stock_quantity"] <= 0]
    print(f"Sin stock: {len(out_of_stock)}")
    print(f"Stock bajo (<=3): {len(low_stock)}")


if __name__ == "__main__":
    main()
