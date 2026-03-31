// ============================================
// Gestión de Movimientos de Stock
// ============================================

// --- Modal de movimiento ---

function openStockModal(productId, type) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('stock-product-id').value = productId;
    document.getElementById('stock-movement-type').value = type;
    document.getElementById('stock-quantity').value = 1;
    document.getElementById('stock-notes').value = '';
    document.getElementById('stock-error').hidden = true;

    const isSale = type === 'sale';
    document.getElementById('stock-modal-title').textContent = isSale ? 'Registrar Venta' : 'Reponer Stock';
    document.getElementById('stock-modal-product').textContent = `${product.reference} - ${product.name}`;
    document.getElementById('stock-modal-current').textContent = `Stock actual: ${product.stock_quantity}`;
    document.getElementById('stock-confirm-btn').textContent = isSale ? 'Registrar Venta' : 'Registrar Reposición';
    document.getElementById('stock-confirm-btn').className = isSale ? 'btn-sale-confirm' : 'btn-restock-confirm';

    if (isSale) {
        document.getElementById('stock-quantity').max = product.stock_quantity;
    } else {
        document.getElementById('stock-quantity').removeAttribute('max');
    }

    document.getElementById('stock-modal').showModal();
}

function closeStockModal() {
    document.getElementById('stock-modal').close();
}

async function confirmStockMovement() {
    const btn = document.getElementById('stock-confirm-btn');
    const errorDiv = document.getElementById('stock-error');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    errorDiv.hidden = true;

    try {
        const productId = document.getElementById('stock-product-id').value;
        const type = document.getElementById('stock-movement-type').value;
        const quantity = parseInt(document.getElementById('stock-quantity').value);
        const notes = document.getElementById('stock-notes').value.trim();

        if (!quantity || quantity < 1) throw new Error('La cantidad debe ser mayor a 0');

        const product = allProducts.find(p => p.id === productId);
        if (type === 'sale' && product && quantity > product.stock_quantity) {
            throw new Error(`Stock insuficiente. Solo hay ${product.stock_quantity} unidades disponibles.`);
        }

        const movementQuantity = type === 'sale' ? -quantity : quantity;

        const { error } = await supabaseClient.from('stock_movements').insert({
            product_id: productId,
            movement_type: type,
            quantity: movementQuantity,
            notes: notes || null
        });

        if (error) throw error;

        closeStockModal();
        showToast(type === 'sale'
            ? `Venta registrada: -${quantity} unidades`
            : `Reposición registrada: +${quantity} unidades`
        );
        await loadProducts();
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.hidden = false;
    } finally {
        btn.setAttribute('aria-busy', 'false');
        btn.disabled = false;
    }
}

// --- Historial de movimientos ---

async function loadMovements() {
    const loading = document.getElementById('movements-loading');
    const empty = document.getElementById('movements-empty');
    const table = document.getElementById('movements-table');

    loading.hidden = false;
    empty.hidden = true;
    table.hidden = true;

    const { data, error } = await supabaseClient
        .from('stock_movements')
        .select('*, products(reference, name)')
        .order('created_at', { ascending: false })
        .limit(200);

    loading.hidden = true;

    if (error) {
        showToast('Error al cargar movimientos: ' + error.message, 'error');
        return;
    }

    allMovements = data || [];
    renderMovements(allMovements);
}

function renderMovements(movements) {
    const empty = document.getElementById('movements-empty');
    const table = document.getElementById('movements-table');
    const tbody = document.getElementById('movements-body');

    if (movements.length === 0) {
        table.hidden = true;
        empty.hidden = false;
        return;
    }

    table.hidden = false;
    empty.hidden = true;

    tbody.innerHTML = movements.map(m => {
        const isNegative = m.quantity < 0;
        const qtyClass = isNegative ? 'qty-negative' : 'qty-positive';
        const qtyText = isNegative ? m.quantity : `+${m.quantity}`;
        return `
            <tr>
                <td>${formatDate(m.created_at)}</td>
                <td>${escapeHtml(m.products?.name || 'Eliminado')}</td>
                <td>${escapeHtml(m.products?.reference || '-')}</td>
                <td><span class="movement-badge movement-${m.movement_type}">${MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span></td>
                <td class="${qtyClass}">${qtyText}</td>
                <td>${escapeHtml(m.notes || '-')}</td>
            </tr>
        `;
    }).join('');
}

// --- Filtros de movimientos ---

function updateMovementProductFilter() {
    const select = document.getElementById('filter-movement-product');
    const current = select.value;
    select.innerHTML = '<option value="">Todos los productos</option>' +
        allProducts.map(p => `<option value="${p.id}">${p.reference} - ${p.name}</option>`).join('');
    select.value = current;
}

document.getElementById('filter-movement-product').addEventListener('change', filterMovements);
document.getElementById('filter-movement-type').addEventListener('change', filterMovements);

function filterMovements() {
    const productId = document.getElementById('filter-movement-product').value;
    const type = document.getElementById('filter-movement-type').value;

    const filtered = allMovements.filter(m => {
        const matchProduct = !productId || m.product_id === productId;
        const matchType = !type || m.movement_type === type;
        return matchProduct && matchType;
    });

    renderMovements(filtered);
}
