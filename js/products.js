// ============================================
// CRUD de Productos
// ============================================

// --- Cargar y renderizar productos ---

async function loadProducts() {
    const loading = document.getElementById('products-loading');
    const empty = document.getElementById('products-empty');
    const table = document.getElementById('products-table');

    loading.hidden = false;
    empty.hidden = true;
    table.hidden = true;

    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('reference');

    loading.hidden = true;

    if (error) {
        showToast('Error al cargar productos: ' + error.message, 'error');
        return;
    }

    allProducts = data || [];
    updateCategoryFilters();
    updateMovementProductFilter();
    renderProducts(allProducts);
}

function renderProducts(products) {
    const empty = document.getElementById('products-empty');
    const table = document.getElementById('products-table');
    const tbody = document.getElementById('products-body');

    if (products.length === 0) {
        table.hidden = true;
        empty.hidden = false;
        return;
    }

    table.hidden = false;
    empty.hidden = true;

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                ${p.image_url
                    ? `<img src="${p.image_url}" alt="${p.name}" class="product-thumb" loading="lazy">`
                    : '<span class="no-image">Sin foto</span>'}
            </td>
            <td><strong>${escapeHtml(p.reference)}</strong></td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category || '-')}</td>
            <td>${escapeHtml(p.material || '-')}</td>
            <td>${formatPrice(p.price)}</td>
            <td><span class="stock-badge ${stockClass(p.stock_quantity)}">${p.stock_quantity}</span></td>
            <td class="actions-cell">
                <button class="outline btn-sm btn-sale" onclick="openStockModal('${p.id}', 'sale')">Venta</button>
                <button class="outline btn-sm btn-restock" onclick="openStockModal('${p.id}', 'restock')">Reponer</button>
                <button class="outline secondary btn-sm" onclick="editProduct('${p.id}')">Editar</button>
                <button class="outline btn-sm btn-delete" onclick="deleteProduct('${p.id}', '${escapeHtml(p.reference)}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// --- Búsqueda y filtrado ---

document.getElementById('search-input').addEventListener('input', filterProducts);
document.getElementById('filter-category').addEventListener('change', filterProducts);

function filterProducts() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('filter-category').value;

    const filtered = allProducts.filter(p => {
        const matchSearch = !search ||
            p.reference.toLowerCase().includes(search) ||
            p.name.toLowerCase().includes(search);
        const matchCategory = !category || p.category === category;
        return matchSearch && matchCategory;
    });

    renderProducts(filtered);
}

function updateCategoryFilters() {
    const select = document.getElementById('filter-category');
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    const current = select.value;

    select.innerHTML = '<option value="">Todas las categorías</option>' +
        categories.map(c => `<option value="${c}">${c}</option>`).join('');

    select.value = current;
}

// --- Ordenación de tabla ---

let currentSort = { field: 'reference', asc: true };

document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.field === field) {
            currentSort.asc = !currentSort.asc;
        } else {
            currentSort.field = field;
            currentSort.asc = true;
        }
        const sorted = [...allProducts].sort((a, b) => {
            let va = a[field] ?? '';
            let vb = b[field] ?? '';
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return currentSort.asc ? -1 : 1;
            if (va > vb) return currentSort.asc ? 1 : -1;
            return 0;
        });
        renderProducts(sorted);
    });
});

// --- Formulario de producto ---

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const errorDiv = document.getElementById('form-error');
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    errorDiv.hidden = true;

    try {
        const id = document.getElementById('product-id').value;
        const reference = document.getElementById('prod-reference').value.trim();
        const name = document.getElementById('prod-name').value.trim();
        const description = document.getElementById('prod-description').value.trim();
        const category = document.getElementById('prod-category').value;
        const material = document.getElementById('prod-material').value;
        const price = document.getElementById('prod-price').value ? parseFloat(document.getElementById('prod-price').value) : null;
        const initialStock = parseInt(document.getElementById('prod-stock').value) || 0;
        const imageFile = document.getElementById('prod-image').files[0];

        let image_url = null;

        // Si hay imagen actual en edición, mantenerla
        if (id) {
            const existing = allProducts.find(p => p.id === id);
            if (existing) image_url = existing.image_url;
        }

        // Subir nueva imagen si se seleccionó
        if (imageFile) {
            image_url = await uploadProductImage(imageFile, reference);
        }

        const productData = { reference, name, description, category, material, price, image_url };

        if (id) {
            // Editar producto existente
            const { error } = await supabaseClient.from('products').update(productData).eq('id', id);
            if (error) throw error;
            showToast('Producto actualizado correctamente');
        } else {
            // Nuevo producto
            productData.stock_quantity = initialStock;
            const { data, error } = await supabaseClient.from('products').insert(productData).select().single();
            if (error) throw error;

            // Registrar movimiento de stock inicial si > 0
            if (initialStock > 0) {
                await supabaseClient.from('stock_movements').insert({
                    product_id: data.id,
                    movement_type: 'restock',
                    quantity: initialStock,
                    notes: 'Stock inicial'
                });
            }
            showToast('Producto creado correctamente');
        }

        resetProductForm();
        await loadProducts();
        switchTab('products');
    } catch (err) {
        errorDiv.textContent = 'Error: ' + err.message;
        errorDiv.hidden = false;
    } finally {
        btn.setAttribute('aria-busy', 'false');
        btn.disabled = false;
    }
});

async function uploadProductImage(file, reference) {
    // Comprimir si es muy grande (> 1MB)
    let fileToUpload = file;
    if (file.size > 1024 * 1024) {
        fileToUpload = await compressImage(file);
    }

    const ext = file.name.split('.').pop();
    const path = `${reference.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.${ext}`;

    const { error } = await supabaseClient.storage
        .from('product-images')
        .upload(path, fileToUpload, { upsert: true });

    if (error) throw error;

    const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
}

function compressImage(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            const maxDim = 1200;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
        };
        img.src = URL.createObjectURL(file);
    });
}

// --- Editar producto ---

function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('form-title').textContent = 'Editar Producto';
    document.getElementById('product-id').value = product.id;
    document.getElementById('prod-reference').value = product.reference;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-description').value = product.description || '';
    document.getElementById('prod-category').value = product.category || '';
    document.getElementById('prod-material').value = product.material || '';
    document.getElementById('prod-price').value = product.price || '';
    document.getElementById('prod-stock').value = product.stock_quantity;
    document.getElementById('prod-stock').disabled = true;
    document.getElementById('cancel-btn').hidden = false;
    document.getElementById('save-btn').textContent = 'Actualizar Producto';

    if (product.image_url) {
        document.getElementById('image-preview').src = product.image_url;
        document.getElementById('image-preview-container').hidden = false;
    }

    switchTab('add-product');
}

// --- Eliminar producto ---

async function deleteProduct(id, reference) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${reference}"? Esta acción no se puede deshacer.`)) return;

    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        showToast('Error al eliminar: ' + error.message, 'error');
        return;
    }

    showToast('Producto eliminado');
    await loadProducts();
}

// --- Reset del formulario ---

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('form-title').textContent = 'Nuevo Producto';
    document.getElementById('prod-stock').disabled = false;
    document.getElementById('cancel-btn').hidden = true;
    document.getElementById('save-btn').textContent = 'Guardar Producto';
    document.getElementById('form-error').hidden = true;
    clearImagePreview();
}

// --- Vista previa de imagen ---

document.getElementById('prod-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('image-preview').src = ev.target.result;
            document.getElementById('image-preview-container').hidden = false;
        };
        reader.readAsDataURL(file);
    }
});

function clearImagePreview() {
    document.getElementById('image-preview-container').hidden = true;
    document.getElementById('image-preview').src = '';
    document.getElementById('prod-image').value = '';
}

// --- Utilidades ---

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
