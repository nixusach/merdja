function formatPrice(price) {
    const num = Number(price);
    return Math.round(num) === num ? num.toFixed(0) : num.toFixed(2);
}

document.addEventListener('DOMContentLoaded', async function() {
    // Verify admin status
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token || !isAdmin) {
        window.location.href = '/index.html';
        return;
    }

    // Tab management
    const allProductsTab = document.getElementById('allProductsTab');
    const addProductTab = document.getElementById('addProductTab');
    const modifyProductTab = document.getElementById('modifyProductTab');
    const updateQuantitiesTab = document.getElementById('updateQuantitiesTab');
    const manageCategoriesTab = document.getElementById('manageCategoriesTab');

    const allProductsSection = document.getElementById('allProductsSection');
    const addProductSection = document.getElementById('addProductSection');
    const modifyProductSection = document.getElementById('modifyProductSection');
    const updateQuantitiesSection = document.getElementById('updateQuantitiesSection');
    const manageCategoriesSection = document.getElementById('manageCategoriesSection');

    
    allProductsTab.addEventListener('click', () => {
        switchTab(allProductsTab, allProductsSection);
        loadAllProducts();
    });

    modifyProductTab.addEventListener('click', () => {
        switchTab(modifyProductTab, modifyProductSection);
    });

    updateQuantitiesTab.addEventListener('click', () => {
        switchTab(updateQuantitiesTab, updateQuantitiesSection);
    });

    manageCategoriesTab.addEventListener('click', () => {
        switchTab(manageCategoriesTab, manageCategoriesSection);
        loadCategoriesList();
    });

    function switchTab(activeTab, activeSection) {
        // Remove active class from all tabs
        [allProductsTab, addProductTab, modifyProductTab, updateQuantitiesTab, manageCategoriesTab].forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all sections
        [allProductsSection, addProductSection, modifyProductSection, updateQuantitiesSection, manageCategoriesSection].forEach(section => {
            section.classList.remove('active');
        });
        
        // Activate the selected tab and section
        activeTab.classList.add('active');
        activeSection.classList.add('active');
    }

    // Initialize variables
    let categories = [];
    let allProducts = [];
    let filteredProducts = [];
    
    // Load initial data
    await loadCategories();
    updateCategorySelects();
    loadAllProducts();

    // Load categories from server
    async function loadCategories() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/admin-products/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error('Échec du chargement des catégories');
            }
            
            categories = await response.json();
            return categories;
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            return [];
        }
    }

    // Update category selects in forms
    function updateCategorySelects() {
        const addSelect = document.getElementById('addCategorySelect');
        const modifySelect = document.getElementById('modifyCategorySelect');
        const filterSelect = document.getElementById('categoryFilter');
        
        // Effacer les options existantes sauf la première
        while (addSelect.options.length > 1) addSelect.remove(1);
        while (modifySelect.options.length > 1) modifySelect.remove(1);
        while (filterSelect.options.length > 1) filterSelect.remove(1);
        
        // Ajouter les nouvelles options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            addSelect.appendChild(option.cloneNode(true));
            modifySelect.appendChild(option.cloneNode(true));
            filterSelect.appendChild(option.cloneNode(true));
        });
    }

    // Load all products
    async function loadAllProducts() {
        try {
            const response = await fetch('/admin-products/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('Échec du chargement des produits');
            }
            
            allProducts = await response.json();
            filteredProducts = [...allProducts];
            applyFilters();
            initFilters();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du chargement des produits: ' + error.message);
        }
    }

    // Initialize filters
    function initFilters() {
        document.getElementById('searchFilter').addEventListener('input', applyFilters);
        document.getElementById('categoryFilter').addEventListener('change', applyFilters);
        document.getElementById('sortBy').addEventListener('change', applyFilters);
    }

    function applyFilters() {
        const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        
        filteredProducts = allProducts.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
            
            return matchesSearch && matchesCategory;
        });
        
        sortProducts(sortBy);
        renderProductsTable(filteredProducts);
    }

    // Sort products
    function sortProducts(sortBy) {
        const [field, direction] = sortBy.split('-');
        
        filteredProducts.sort((a, b) => {
            let comparison = 0;
            
            switch (field) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                case 'price':
                    comparison = a.basePrice - b.basePrice;
                    break;
            }
            
            return direction === 'desc' ? -comparison : comparison;
        });
    }

    // Reset filters
    function resetFilters() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('availabilityFilter').value = '';
        document.getElementById('sortBy').value = 'name-asc';
        filteredProducts = [...allProducts];
        renderProductsTable(filteredProducts);
    }

    // Render products table
    function renderProductsTable(products) {
        const tableBody = document.querySelector('#productsTable tbody');
        tableBody.innerHTML = '';
        
        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Aucun produit trouvé</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const hasMultipleVariants = product.variants.length > 1;
            
            if (hasMultipleVariants) {
                // Create main product row for multi-variant products
                const mainRow = document.createElement('tr');
                mainRow.className = 'product-main-row';
                mainRow.dataset.productId = product._id || product.name.replace(/\s+/g, '-').toLowerCase();
                
                mainRow.innerHTML = `
                    <td>
                        <span class="toggle-variants">▶</span>
                        ${product.name}
                    </td>
                    <td>${product.category}</td>
                    <td>${product.variants.length} variants</td>
                    <td></td> <!-- Empty price for multi-variant -->
                    <td></td> <!-- Empty quantity for multi-variant -->
                    <td class="available-${product.variants.some(v => v.available)}">
                        ${product.variants.some(v => v.available) ? 'Oui' : 'Non'}
                    </td>
                    <td>${product.description || '-'}</td>
                `;
                
                tableBody.appendChild(mainRow);
                
                // Add variant rows (initially hidden)
                product.variants.forEach(variant => {
                    const variantRow = document.createElement('tr');
                    variantRow.className = 'variant-row';
                    variantRow.style.display = 'none';
                    variantRow.dataset.productId = mainRow.dataset.productId;
                    
                    variantRow.innerHTML = `
                        <td></td> <!-- Empty product name -->
                        <td></td> <!-- Empty category -->
                        <td>${variant.name}</td>
                        <td>${formatPrice(variant.price)} DA</td>
                        <td>${variant.quantity}</td>
                        <td class="available-${variant.available}">${variant.available ? 'Oui' : 'Non'}</td>
                        <td></td> <!-- Empty description -->
                    `;
                    
                    tableBody.appendChild(variantRow);
                });
                
                // Add click event to toggle arrow
                const toggleArrow = mainRow.querySelector('.toggle-variants');
                toggleArrow.addEventListener('click', function() {
                    const isExpanded = this.textContent === '▼';
                    this.textContent = isExpanded ? '▶' : '▼';
                    
                    // Toggle all variant rows for this product
                    const variantRows = tableBody.querySelectorAll(`tr.variant-row[data-product-id="${mainRow.dataset.productId}"]`);
                    variantRows.forEach(row => {
                        row.style.display = isExpanded ? 'none' : 'table-row';
                    });
                });
            } else {
                // Single variant - show directly without arrow
                const variant = product.variants[0];
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${variant.name}</td>
                    <td>${formatPrice(variant.price)} DA</td>
                    <td>${variant.quantity}</td>
                    <td class="available-${variant.available}">${variant.available ? 'Oui' : 'Non'}</td>
                    <td>${product.description || '-'}</td>
                `;
                
                tableBody.appendChild(row);
            }
        });
    }

    // Variant management
    const addVariantBtn = document.getElementById('addVariantBtn');
    const variantsContainer = document.getElementById('variantsContainer');
    const modifyAddVariantBtn = document.getElementById('modifyAddVariantBtn');
    const modifyVariantsContainer = document.getElementById('modifyVariantsContainer');
    
    addVariantBtn.addEventListener('click', () => addVariantField());
    modifyAddVariantBtn.addEventListener('click', () => addModifyVariantField());

    addProductTab.addEventListener('click', () => {
        switchTab(addProductTab, addProductSection);
        variantsContainer.innerHTML = '';
        addVariantField('', '', '');
    });

    // Add variant field to add form
    function addVariantField(name = '', price = 0, quantity = 0) {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item';
        variantDiv.innerHTML = `
            <div class="variant-inputs">
                <input type="text" class="variant-name" placeholder="Nom de la variante" value="${name}" required>
                <input type="number" class="variant-price" placeholder="Prix (DA)" min="0" step="0.01" value="${price}" required>
                <input type="number" class="variant-quantity" placeholder="Quantité" min="0" value="${quantity}" required>
                <span class="availability-display">${quantity > 0 ? 'Disponible' : 'Non disponible'}</span>
                <button type="button" class="btn btn-sm btn-danger remove-variant">Supprimer</button>
            </div>
        `;
        
        const quantityInput = variantDiv.querySelector('.variant-quantity');
        const availabilityDisplay = variantDiv.querySelector('.availability-display');
        
        quantityInput.addEventListener('input', function() {
            const isAvailable = this.value > 0;
            availabilityDisplay.textContent = isAvailable ? 'Disponible' : 'Non disponible';
            availabilityDisplay.className = `availability-display available-${isAvailable}`;
        });
        
        variantsContainer.appendChild(variantDiv);
        variantDiv.querySelector('.remove-variant').addEventListener('click', () => variantDiv.remove());
    }

    function addModifyVariantField(name = '', price = 0, quantity = 0) {
        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item';
        variantDiv.innerHTML = `
            <div class="variant-inputs">
                <input type="text" class="variant-name" placeholder="Nom de la variante" value="${name}" required>
                <input type="number" class="variant-price" placeholder="Prix (DA)" min="0" step="0.01" value="${price}" required>
                <input type="number" class="variant-quantity" placeholder="Quantité" min="0" value="${quantity}" required>
                <span class="availability-display available-${quantity > 0}">
                    ${quantity > 0 ? 'Disponible' : 'Non disponible'}
                </span>
                <button type="button" class="btn btn-sm btn-danger remove-variant">Supprimer</button>
            </div>
        `;
        
        const quantityInput = variantDiv.querySelector('.variant-quantity');
        const availabilityDisplay = variantDiv.querySelector('.availability-display');
        
        quantityInput.addEventListener('input', function() {
            const isAvailable = this.value > 0;
            availabilityDisplay.textContent = isAvailable ? 'Disponible' : 'Non disponible';
            availabilityDisplay.className = `availability-display available-${isAvailable}`;
        });
        
        modifyVariantsContainer.appendChild(variantDiv);
        variantDiv.querySelector('.remove-variant').addEventListener('click', () => variantDiv.remove());
    }

    // Image preview handling
    const addImagesInput = document.getElementById('addImages');
    const addImagesPreview = document.getElementById('addImagesPreview');
    const modifyImagesInput = document.getElementById('modifyImages');
    const modifyImagesPreview = document.getElementById('modifyImagesPreview');
    
    function setupImagePreview(input, preview) {
        input.addEventListener('change', function() {
            preview.innerHTML = '';
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const item = document.createElement('div');
                    item.className = 'image-preview-item';
                    item.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="remove-image" data-filename="${file.name}">X</div>
                    `;
                    preview.appendChild(item);
                    
                    item.querySelector('.remove-image').addEventListener('click', function() {
                        const files = Array.from(input.files);
                        const index = files.findIndex(f => f.name === this.dataset.filename);
                        if (index !== -1) {
                            files.splice(index, 1);
                            const dataTransfer = new DataTransfer();
                            files.forEach(f => dataTransfer.items.add(f));
                            input.files = dataTransfer.files;
                        }
                        item.remove();
                    });
                };
                reader.readAsDataURL(file);
            });
        });
    }
    
    setupImagePreview(addImagesInput, addImagesPreview);
    setupImagePreview(modifyImagesInput, modifyImagesPreview);

    // Add product form submission
    const addProductForm = document.getElementById('addProductForm');
    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const category = document.getElementById('addCategorySelect').value;
            if (!category) {
                alert('Veuillez sélectionner une catégorie');
                return;
            }
            
            // Collect variants
            const variants = [];
            document.querySelectorAll('#variantsContainer .variant-item').forEach(variant => {
                const name = variant.querySelector('.variant-name').value;
                const price = Number(variant.querySelector('.variant-price').value);
                const quantity = Number(variant.querySelector('.variant-quantity').value);
                
                if (!name) {
                    throw new Error('Toutes les variantes doivent avoir un nom');
                }
                
                variants.push({ 
                    name, 
                    price: isNaN(price) ? 0 : price, 
                    quantity: isNaN(quantity) ? 0 : quantity 
                });
            });
            
            if (variants.length === 0) {
                alert('Veuillez ajouter au moins une variante');
                return;
            }
            
            // Prepare form data
            const formData = new FormData();
            formData.append('name', document.getElementById('addName').value || '');
            formData.append('category', category);
            formData.append('description', document.getElementById('addDescription').value || '');
            formData.append('featured', document.getElementById('addFeatured').checked.toString());
            formData.append('variants', JSON.stringify(variants));
            
            // Add images
            for (let i = 0; i < addImagesInput.files.length; i++) {
                formData.append('images', addImagesInput.files[i]);
            }
            
            const response = await fetch('/admin-products/products', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Échec de l\'ajout');
            }
            
            alert('Produit ajouté avec succès !');
            addProductForm.reset();
            variantsContainer.innerHTML = '';
            addImagesPreview.innerHTML = '';
            loadAllProducts();
            switchTab(allProductsTab, allProductsSection);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur: ' + (error.message || 'Une erreur est survenue'));
        }
    });

    // Product search for modification
    const searchProductBtn = document.getElementById('searchProductBtn');
    const searchProductName = document.getElementById('searchProductName');
    const modifyProductForm = document.getElementById('modifyProductForm');
    
    searchProductBtn.addEventListener('click', async function() {
        const name = searchProductName.value.trim();
        if (!name) {
            alert('Veuillez entrer un nom de produit');
            return;
        }
        
        try {
            const response = await fetch(`/admin-products/products/${encodeURIComponent(name)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('Produit non trouvé');
            }
            
            const product = await response.json();
            populateModifyForm(product);
            modifyProductForm.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur: ' + error.message);
            modifyProductForm.style.display = 'none';
        }
    });

    // Populate modify form
    function populateModifyForm(product) {
        document.getElementById('modifyName').value = product.name;
        document.getElementById('modifyCategorySelect').value = product.category;
        document.getElementById('modifyDescription').value = product.description || '';
        document.getElementById('modifyFeatured').checked = product.featured || false;
        
        // Populate variants
        modifyVariantsContainer.innerHTML = '';
        if (product.variants?.length > 0) {
            product.variants.forEach(v => 
                addModifyVariantField(v.name, v.price, v.quantity)
            );
        }
        
        // Show current images
        const currentImagesPreview = document.getElementById('currentImagesPreview');
        currentImagesPreview.innerHTML = '';
        
        if (product.images?.length > 0) {
            product.images.forEach(image => {
                const item = document.createElement('div');
                item.className = 'image-preview-item';
                item.innerHTML = `
                    <img src="/images/products/${image}" alt="${image}">
                    <div class="remove-image" data-image="${image}">X</div>
                `;
                currentImagesPreview.appendChild(item);
                
                item.querySelector('.remove-image').addEventListener('click', async function() {
                    if (!confirm('Supprimer cette image ?')) return;
                    
                    try {
                        const response = await fetch(`/admin-products/products/${encodeURIComponent(product.name)}/images/${encodeURIComponent(image)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (!response.ok) {
                            if (response.status === 401) window.location.href = '/login.html';
                            throw new Error('Échec de suppression');
                        }
                        
                        item.remove();
                        alert('Image supprimée');
                    } catch (error) {
                        console.error('Erreur:', error);
                        alert('Erreur: ' + error.message);
                    }
                });
            });
        } else {
            currentImagesPreview.innerHTML = '<p>Aucune image</p>';
        }
        
        modifyImagesPreview.innerHTML = '';
        modifyImagesInput.value = '';
    }


    // Modify product form submission
    modifyProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const category = document.getElementById('modifyCategorySelect').value;
        
        if (!category) {
            alert('Veuillez sélectionner une catégorie');
            return;
        }
        
        // Collect variants
        const variants = [];
        document.querySelectorAll('#modifyVariantsContainer .variant-item').forEach(variant => {
            const name = variant.querySelector('.variant-name').value;
            const price = Number(variant.querySelector('.variant-price').value);
            const quantity = Number(variant.querySelector('.variant-quantity').value);
            if (name) variants.push({ name, price, quantity });
        });
        
        if (variants.length === 0) {
            alert('Veuillez ajouter au moins une variante');
            return;
        }
        
        // Prepare form data
        const formData = new FormData();
        formData.append('name', document.getElementById('modifyName').value);
        formData.append('category', category);
        formData.append('description', document.getElementById('modifyDescription').value);
        formData.append('featured', document.getElementById('modifyFeatured').checked);
        formData.append('variants', JSON.stringify(variants));
        
        // Add images
        for (let i = 0; i < modifyImagesInput.files.length; i++) {
            formData.append('images', modifyImagesInput.files[i]);
        }
        
        try {
            const response = await fetch(`/admin-products/products/${encodeURIComponent(document.getElementById('modifyName').value)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!response.ok) throw new Error('Échec de la mise à jour');
            
            alert('Produit mis à jour !');
            modifyImagesPreview.innerHTML = '';
            loadAllProducts();
            switchTab(allProductsTab, allProductsSection);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur: ' + error.message);
        }
    });

    // Delete product
    const deleteProductBtn = document.getElementById('deleteProductBtn');
    deleteProductBtn.addEventListener('click', async function() {
        if (!confirm('Supprimer ce produit ?')) return;
        
        const name = document.getElementById('modifyName').value;
        
        try {
            const response = await fetch(`/admin-products/products/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('Échec de suppression');
            }
            
            const result = await response.json();
            alert('Produit supprimé !');
            modifyProductForm.reset();
            modifyProductForm.style.display = 'none';
            searchProductName.value = '';
            modifyVariantsContainer.innerHTML = '';
            currentImagesPreview.innerHTML = '';
            modifyImagesPreview.innerHTML = '';
            loadAllProducts();
            switchTab(allProductsTab, allProductsSection);
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur: ' + error.message);
        }
    });


    // Quantity Update Functionality
    const updateQuantitiesForm = document.getElementById('updateQuantitiesForm');
    const quantityUpdatePreview = document.getElementById('quantityUpdatePreview');
    const quantityPreviewTable = document.querySelector('#quantityPreviewTable tbody');
    const confirmQuantityUpdateBtn = document.getElementById('confirmQuantityUpdateBtn');
    let quantityUpdateData = [];

    updateQuantitiesForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const file = document.getElementById('quantityExcelFile').files[0];
        if (!file) {
            alert('Veuillez sélectionner un fichier Excel');
            return;
        }
        
        try {
            const data = await readExcelFile(file);
            quantityUpdateData = processQuantityUpdateData(data);
            
            if (quantityUpdateData.length === 0) {
                alert('Aucun variant correspondant trouvé dans le fichier Excel');
                return;
            }
            
            renderQuantityUpdatePreview(quantityUpdateData);
            quantityUpdatePreview.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la lecture du fichier Excel: ' + error.message);
        }
    });

    function processQuantityUpdateData(data) {
        const updates = [];
        
        data.forEach(row => {
            if (!row['Désignation'] || row['Quantité'] === undefined) return;
            
            const variantName = row['Désignation'].trim();
            const newQuantity = parseInt(row['Quantité']) || 0;
            
            // Find matching products in our existing data
            allProducts.forEach(product => {
                product.variants.forEach(variant => {
                    if (variant.name === variantName) {
                        updates.push({
                            productId: product._id,
                            productName: product.name,
                            variantName: variant.name,
                            oldQuantity: variant.quantity,
                            newQuantity: newQuantity
                        });
                    }
                });
            });
        });
        
        return updates;
    }

    function renderQuantityUpdatePreview(updates) {
        quantityPreviewTable.innerHTML = '';
        
        updates.forEach(update => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${update.productName}</td>
                <td>${update.variantName}</td>
                <td>${update.oldQuantity}</td>
                <td class="${update.newQuantity > update.oldQuantity ? 'text-success' : 'text-danger'}">
                    ${update.newQuantity}
                </td>
            `;
            quantityPreviewTable.appendChild(row);
        });
    }

    confirmQuantityUpdateBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/admin-products/update-quantities', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ updates: quantityUpdateData })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Échec de la mise à jour');
            }
            
            const result = await response.json();
            alert(`${result.updatedCount} quantités mises à jour avec succès !`);
            
            // Reset form and reload products
            updateQuantitiesForm.reset();
            quantityUpdatePreview.style.display = 'none';
            loadAllProducts();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour: ' + error.message);
        }
    });

    // Helper function to read Excel files
    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Category management
    async function loadCategoriesList() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/admin-products/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error('Échec du chargement des catégories');
            }
            
            const categories = await response.json();
            
            const categoriesList = document.querySelector('.categories-list');
            categoriesList.innerHTML = '';
            
            if (categories.length === 0) {
                categoriesList.innerHTML = '<p>Aucune catégorie trouvée. Ajoutez votre première catégorie !</p>';
                return;
            }
            
            categories.forEach(category => {
                const categoryCard = document.createElement('div');
                categoryCard.className = 'category-card';
                categoryCard.innerHTML = `
                    <div class="category-image">
                        <img src="/images/categories/${category.image}" alt="${category.name}">
                    </div>
                    <div class="category-info">
                        <h4 class="category-name">${category.name}</h4>
                        <div class="category-actions">
                            <button class="btn-secondary edit-category" data-id="${category._id}">Modifier</button>
                            <button class="btn-danger delete-category" data-id="${category._id}">Supprimer</button>
                        </div>
                    </div>
                `;
                categoriesList.appendChild(categoryCard);
            });
            
            // Ajouter des écouteurs d'événements aux boutons de modification et de suppression
            document.querySelectorAll('.edit-category').forEach(btn => {
                btn.addEventListener('click', () => openEditCategoryModal(btn.dataset.id));
            });
            
            document.querySelectorAll('.delete-category').forEach(btn => {
                btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            alert('Erreur lors du chargement des catégories: ' + error.message);
        }
    }
    
    // Gestion des modales
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const addCategoryModal = document.getElementById('addCategoryModal');
    const editCategoryModal = document.getElementById('editCategoryModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    addCategoryBtn.addEventListener('click', () => {
        addCategoryModal.style.display = 'block';
    });
    
    closeModalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            addCategoryModal.style.display = 'none';
            editCategoryModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === addCategoryModal) {
            addCategoryModal.style.display = 'none';
        }
        if (e.target === editCategoryModal) {
            editCategoryModal.style.display = 'none';
        }
    });
    
    // Prévisualisation d'image pour l'ajout de catégorie
    const categoryImageInput = document.getElementById('categoryImage');
    const categoryImagePreview = document.getElementById('categoryImagePreview');
    
    categoryImageInput.addEventListener('change', function() {
        categoryImagePreview.innerHTML = '';
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                categoryImagePreview.appendChild(img);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Prévisualisation d'image pour la modification de catégorie
    const editCategoryImageInput = document.getElementById('editCategoryImage');
    const editCategoryImagePreview = document.getElementById('editCategoryImagePreview');
    
    editCategoryImageInput.addEventListener('change', function() {
        editCategoryImagePreview.innerHTML = '';
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                editCategoryImagePreview.appendChild(img);
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Formulaire d'ajout de catégorie
    const addCategoryForm = document.getElementById('addCategoryForm');
    addCategoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('name', document.getElementById('categoryName').value);
        formData.append('image', categoryImageInput.files[0]);
        
        try {
            const response = await fetch('/admin-products/categories', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de l\'ajout de la catégorie');
            }
            
            const result = await response.json();
            alert('Catégorie ajoutée avec succès !');
            addCategoryForm.reset();
            categoryImagePreview.innerHTML = '';
            addCategoryModal.style.display = 'none';
            loadCategoriesList();
            loadCategories(); // Actualiser les catégories pour les formulaires de produits
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'ajout de la catégorie: ' + error.message);
        }
    });
    
    // Ouvrir la modale de modification de catégorie
    async function openEditCategoryModal(categoryId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/admin-products/categories', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error('Échec du chargement des catégories');
            }
            
            const categories = await response.json();
            const category = categories.find(c => c._id === categoryId);
            if (!category) throw new Error('Catégorie non trouvée');
            
            document.getElementById('editCategoryId').value = category._id;
            document.getElementById('editCategoryName').value = category.name;
            
            editCategoryImagePreview.innerHTML = `
                <img src="/images/categories/${category.image}" alt="${category.name}">
            `;
            
            editCategoryModal.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du chargement de la catégorie: ' + error.message);
        }
    }
    
    // Formulaire de modification de catégorie
    const editCategoryForm = document.getElementById('editCategoryForm');
    editCategoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const categoryId = document.getElementById('editCategoryId').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('editCategoryName').value);
        
        if (editCategoryImageInput.files[0]) {
            formData.append('image', editCategoryImageInput.files[0]);
        }
        
        try {
            const response = await fetch(`/admin-products/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la mise à jour de la catégorie');
            }
            
            const result = await response.json();
            alert('Catégorie mise à jour avec succès !');
            editCategoryForm.reset();
            editCategoryImagePreview.innerHTML = '';
            editCategoryModal.style.display = 'none';
            loadCategoriesList();
            loadCategories(); // Actualiser les catégories pour les formulaires de produits
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour de la catégorie: ' + error.message);
        }
    });
    
    // Suppression de catégorie
    async function deleteCategory(categoryId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les produits de cette catégorie n\'auront plus de catégorie.')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/admin-products/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la suppression de la catégorie');
            }
            
            const result = await response.json();
            alert('Catégorie supprimée avec succès !');
            loadCategoriesList();
            loadCategories(); // Actualiser les catégories pour les formulaires de produits
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression de la catégorie: ' + error.message);
        }
    }

    // Excel Import Functionality
    const excelImportForm = document.getElementById('excelImportForm');
    const importPreview = document.getElementById('importPreview');
    const previewTable = document.querySelector('#previewTable tbody');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    let importData = [];

    // Initialize ExcelJS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => console.log('XLSX loaded');
    document.head.appendChild(script);

    // Handle Excel import form submission
    excelImportForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const file = document.getElementById('excelFile').files[0];
        if (!file) {
            alert('Veuillez sélectionner un fichier Excel');
            return;
        }
        
        try {
            const data = await readExcelFile(file);
            importData = processExcelData(data);
            
            // Show preview
            renderImportPreview(importData);
            importPreview.style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la lecture du fichier Excel: ' + error.message);
        }
    });

    // Read Excel file
    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Process Excel data into product structure
    function processExcelData(data) {
        const productsMap = new Map();
        
        // First pass: Count occurrences of each word prefix
        const prefixCounts = new Map();
        
        data.forEach(row => {
            if (!row['Désignation']) return;
            const variantName = row['Désignation'].trim();
            const words = variantName.split(' ');
            
            // Track how many variants share the same 1-word, 2-word, etc. prefixes
            for (let i = 1; i <= words.length; i++) {
                const prefix = words.slice(0, i).join(' ');
                prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
            }
        });

        // Second pass: Create products and variants
        data.forEach(row => {
            if (!row['Désignation']) return;
            
            const variantName = row['Désignation'].trim();
            const words = variantName.split(' ');
            const price = parseFloat(row['Détail']) || 0;
            const quantity = parseInt(row['Quantité']) || 0; // This will include 0 values

            // Find the best prefix (same logic as before)
            let bestPrefix = variantName;
            for (let i = 1; i <= words.length; i++) {
                const currentPrefix = words.slice(0, i).join(' ');
                const nextPrefix = words.slice(0, i + 1).join(' ');
                
                if (prefixCounts.get(nextPrefix) < prefixCounts.get(currentPrefix)) {
                    bestPrefix = currentPrefix;
                    break;
                }
            }

            if (prefixCounts.get(bestPrefix) === 1) {
                bestPrefix = variantName;
            }

            if (!productsMap.has(bestPrefix)) {
                productsMap.set(bestPrefix, {
                    name: bestPrefix,
                    category: '',
                    description: document.getElementById('importDescription').value || '',
                    featured: document.getElementById('importFeatured').checked,
                    variants: []
                });
            }

            // Always add the variant, even if quantity is 0
            productsMap.get(bestPrefix).variants.push({
                name: variantName,
                price,
                quantity,
                available: quantity > 0
            });
        });

        return Array.from(productsMap.values());
    }

    // Render import preview
    function renderImportPreview(products) {
        previewTable.innerHTML = '';
        
        if (products.length === 0) {
            previewTable.innerHTML = '<tr><td colspan="4">Aucun produit trouvé dans le fichier</td></tr>';
            return;
        }
        
        products.forEach(product => {
            product.variants.forEach((variant, index) => {
                const row = document.createElement('tr');
                
                if (index === 0) {
                    const nameCell = document.createElement('td');
                    nameCell.rowSpan = product.variants.length;
                    nameCell.textContent = product.name;
                    row.appendChild(nameCell);
                }
                
                row.innerHTML += `
                    <td>${variant.name}</td>
                    <td>${formatPrice(variant.price)} DA</td>
                    <td>${variant.quantity}</td>
                `;
                
                previewTable.appendChild(row);
            });
        });
    }

    // Confirm import button
    confirmImportBtn.addEventListener('click', async function() {
        if (importData.length === 0) {
            alert('Aucune donnée à importer');
            return;
        }
        
        try {
            // Get token again to ensure it's available
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/index.html';
                return;
            }

            const description = document.getElementById('importDescription').value;
            const featured = document.getElementById('importFeatured').checked;
            
            // Update all products with the same description and featured status
            importData.forEach(product => {
                if (description) product.description = description;
                product.featured = featured;
            });
            
            const response = await fetch('/admin-products/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ products: importData })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Échec de l\'importation');
            }
            
            const result = await response.json();
            alert(`${result.insertedCount} produits importés avec succès !`);
            
            // Reset form
            excelImportForm.reset();
            importPreview.style.display = 'none';
            loadAllProducts();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'importation: ' + error.message);
        }
    });
});

