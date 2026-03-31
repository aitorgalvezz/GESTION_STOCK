"""
Importar productos desde un archivo CSV a Supabase.

Uso:
    1. Crea un archivo .env en la carpeta scripts/ con:
       SUPABASE_URL=https://tu-proyecto.supabase.co
       SUPABASE_SERVICE_KEY=tu-service-role-key

    2. Prepara un CSV con columnas: reference,name,description,category,material,price,stock_quantity
       Ejemplo:
       reference,name,description,category,material,price,stock_quantity
       ANL-001,Anillo Solitario,Anillo con diamante 0.5ct,Anillos,Oro,1200.00,5

    3. Ejecuta: python bulk_import.py productos.csv
"""

import csv
import sys
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def main():
    if len(sys.argv) < 2:
        print("Uso: python bulk_import.py <archivo.csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print(f"Error: No se encuentra el archivo '{csv_path}'")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en el archivo .env")
        sys.exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        products = []
        for row in reader:
            product = {
                "reference": row["reference"].strip(),
                "name": row["name"].strip(),
                "description": row.get("description", "").strip() or None,
                "category": row.get("category", "").strip() or None,
                "material": row.get("material", "").strip() or None,
                "price": float(row["price"]) if row.get("price") else None,
                "stock_quantity": int(row.get("stock_quantity", 0)),
            }
            products.append(product)

    if not products:
        print("El CSV no contiene productos.")
        sys.exit(1)

    print(f"Importando {len(products)} productos...")

    result = client.table("products").insert(products).execute()
    print(f"Importados correctamente: {len(result.data)} productos")

    # Crear movimientos de stock inicial para los que tienen stock > 0
    movements = []
    for prod in result.data:
        if prod["stock_quantity"] > 0:
            movements.append({
                "product_id": prod["id"],
                "movement_type": "restock",
                "quantity": prod["stock_quantity"],
                "notes": "Importación CSV - stock inicial",
            })

    if movements:
        client.table("stock_movements").insert(movements).execute()
        print(f"Registrados {len(movements)} movimientos de stock inicial")

    print("Importación completada.")


if __name__ == "__main__":
    main()
