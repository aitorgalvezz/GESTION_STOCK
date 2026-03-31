"""
Backup completo de la base de datos a CSV.
Exporta productos y movimientos de stock.

Uso:
    1. Crea un archivo .env en la carpeta scripts/ con:
       SUPABASE_URL=https://thgbqasrjpmkhanmotps.supabase.co
       SUPABASE_SERVICE_KEY=tu-service-role-key

    2. Ejecuta: python backup.py
       Se creará una carpeta backup_YYYYMMDD_HHMMSS/ con los CSVs.
"""

import csv
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def export_table(client, table_name, fields, output_path):
    result = client.table(table_name).select("*").order("created_at").execute()
    rows = result.data

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)


def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en el archivo .env")
        print("La service key la encuentras en Supabase > Settings > API Keys > Secret keys")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"backup_{timestamp}"
    os.makedirs(backup_dir, exist_ok=True)

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print(f"Backup iniciado: {backup_dir}/")
    print("-" * 40)

    product_fields = ["id", "reference", "name", "description", "category", "material", "price", "stock_quantity", "image_url", "created_at", "updated_at"]
    n = export_table(client, "products", product_fields, os.path.join(backup_dir, "products.csv"))
    print(f"Productos: {n} registros")

    movement_fields = ["id", "product_id", "movement_type", "quantity", "notes", "created_at"]
    n = export_table(client, "stock_movements", movement_fields, os.path.join(backup_dir, "stock_movements.csv"))
    print(f"Movimientos: {n} registros")

    print("-" * 40)
    print(f"Backup completado en: {backup_dir}/")


if __name__ == "__main__":
    main()
