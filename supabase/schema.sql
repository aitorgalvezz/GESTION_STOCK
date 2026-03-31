-- ============================================
-- Schema: Gestión de Stock - Joyería
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de productos
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    material VARCHAR(100),
    price DECIMAL(10, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de movimientos de stock (trazabilidad)
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'return')),
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: actualizar stock_quantity automáticamente al insertar un movimiento
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_movement();

-- ============================================
-- Row Level Security (RLS)
-- Solo usuarios autenticados pueden acceder
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access on products"
    ON products FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access on stock_movements"
    ON stock_movements FOR ALL
    USING (auth.role() = 'authenticated');

-- ============================================
-- Storage: crear bucket para imágenes
-- Ejecutar esto en la sección Storage de Supabase:
-- 1. Crear bucket "product-images" con acceso público para lectura
-- 2. Añadir política: authenticated users pueden INSERT y DELETE
-- ============================================

-- Índices útiles
CREATE INDEX idx_products_reference ON products(reference);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);
