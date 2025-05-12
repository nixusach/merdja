document.addEventListener('DOMContentLoaded', function() {
    fetchProducts();
    
    // Add event listeners for filters
    document.getElementById('search-input').addEventListener('input', filterProducts);
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('availability-filter').addEventListener('change', function() {
        localStorage.setItem('availabilityFilterChanged', 'true');
        filterProducts();
    });
    document.getElementById('sort-filter').addEventListener('change', filterProducts);
});

let allProducts = [];
let firstLoad = true;

function fetchProducts() {
    fetch('/api/products/shop')
        .then(response => response.json())
        .then(products => {
            allProducts = products;
            populateCategoryFilter(products);
            // Set dropdown to show "Tous les produits" but filter will default to available
            document.getElementById('availability-filter').value = '';
            filterProducts();
            firstLoad = false;
        })
        .catch(error => {
            console.error('Error loading products:', error);
        });
}

function populateCategoryFilter(products) {
    const categoryFilter = document.getElementById('category-filter');
    const categories = new Set();
    
    products.forEach(product => {
        if (product.category) {
            categories.add(product.category);
        }
    });
    
    // Sort categories alphabetically
    const sortedCategories = Array.from(categories).sort();
    
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    let availability = document.getElementById('availability-filter').value;
    const sortOption = document.getElementById('sort-filter').value;
    
    // On first load or if user hasn't changed filter, show only available
    if (firstLoad || !localStorage.getItem('availabilityFilterChanged')) {
        availability = 'available';
    }
    
    let filteredProducts = [...allProducts];
    
    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (category) {
        filteredProducts = filteredProducts.filter(product => 
            product.category === category
        );
    }
    
    // Apply availability filter
    if (availability) {
        filteredProducts = filteredProducts.filter(product => {
            const isAvailable = product.variants.some(variant => variant.available);
            return availability === 'available' ? isAvailable : !isAvailable;
        });
    }
    
    // Apply sorting
    filteredProducts = sortProducts(filteredProducts, sortOption);
    
    populateProductTable(filteredProducts);
}

function sortProducts(products, sortOption) {
    return [...products].sort((a, b) => {
        switch (sortOption) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'price-asc':
                // Sort by minimum variant price
                const aMinPrice = Math.min(...a.variants.map(v => v.price));
                const bMinPrice = Math.min(...b.variants.map(v => v.price));
                return aMinPrice - bMinPrice;
            case 'price-desc':
                // Sort by maximum variant price
                const aMaxPrice = Math.max(...a.variants.map(v => v.price));
                const bMaxPrice = Math.max(...b.variants.map(v => v.price));
                return bMaxPrice - aMaxPrice;
            default:
                return 0;
        }
    });
}

function getVariantsDisplay(variants) {
    if (!variants || variants.length === 0) return '';
    
    if (variants.length === 1) {
        return `<span class="variant-tag">1 Variant</span>`;
    } else {
        return `<span class="variant-tag">${variants.length} Variants</span>`;
    }
}

function getPriceDisplay(variants) {
    if (!variants || variants.length === 0) return '0.00 DA';
    
    const prices = variants.map(v => v.price).filter(p => p !== undefined);
    if (prices.length === 0) return '0.00 DA';
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
        return `${minPrice.toLocaleString('en-US')} DA`;
    } else {
        return `${minPrice.toLocaleString('en-US')}-${maxPrice.toLocaleString('en-US')} DA`;
    }
}

function populateProductTable(products) {
    const table = document.getElementById('product-table');
    table.innerHTML = '';
    
    const isLoggedIn = checkLoggedInStatus();
    const productsPerRow = 7;
    const totalProducts = products.length;
    const totalRows = Math.ceil(totalProducts / productsPerRow);

    // First pass to detect if any row needs 2-line names
    let needsTwoLines = false;
    for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < productsPerRow; col++) {
            const productIndex = row * productsPerRow + col;
            if (productIndex < totalProducts) {
                const product = products[productIndex];
                if (product.name.length > 30) { // If any name needs truncation
                    needsTwoLines = true;
                    break;
                }
            }
        }
        if (needsTwoLines) break;
    }

    // Function to truncate names only when needed
    const displayName = (name) => {
        return name.length > 30 ? name.substring(0, 27) + '...' : name;
    };

    for (let row = 0; row < totalRows; row++) {
        const currentRow = document.createElement('tr');
        table.appendChild(currentRow);

        // Check if this specific row needs 2-line treatment
        let rowNeedsTwoLines = needsTwoLines;
        if (!rowNeedsTwoLines) {
            for (let col = 0; col < productsPerRow; col++) {
                const productIndex = row * productsPerRow + col;
                if (productIndex < totalProducts && products[productIndex].name.length > 30) {
                    rowNeedsTwoLines = true;
                    break;
                }
            }
        }

        for (let col = 0; col < productsPerRow; col++) {
            const cell = document.createElement('td');
            const productIndex = row * productsPerRow + col;
            
            if (productIndex < totalProducts) {
                const product = products[productIndex];
                const productImage = product.images?.[0] || 'images/default-product.jpg';
                const isAvailable = product.variants.some(v => v.available);
                const category = product.category || '&nbsp;&nbsp;';

                cell.innerHTML = `
                    <div class="product-card">
                        <img src="images/products/${productImage}" alt="${product.name}" class="product-image ${!isAvailable ? 'sold-out' : ''}">
                        <div class="product-info">
                            <h3 class="product-name" title="${product.name}" 
                                style="${rowNeedsTwoLines ? 'min-height: 2.6em' : ''}">
                                ${displayName(product.name)}
                            </h3>
                            <p class="product-category">${category}</p>
                            <div class="product-variants">
                                ${getVariantsDisplay(product.variants)}
                            </div>
                            <p class="product-price ${!isLoggedIn ? 'price-hidden' : ''}">
                                ${isLoggedIn ? getPriceDisplay(product.variants) : '~ ~ ~'}
                            </p>
                            <button class="buy-now ${!isAvailable ? 'out-of-stock-btn' : ''}" 
                                    ${!isAvailable ? 'disabled' : ''}
                                    data-product-name="${product.name}">
                                ${isAvailable ? 'Acheter' : 'Non disponible'}
                            </button>
                        </div>
                    </div>
                `;
            } else {
                cell.className = 'empty-cell';
                cell.innerHTML = '';
            }
            currentRow.appendChild(cell);
        }
    }

    // Rest of your event listeners...
    document.querySelectorAll('.price-hidden').forEach(el => {
        el.addEventListener('click', () => {
            showTempNotification('Veuillez vous connecter pour voir les prix', 'info', 3000);
        });
    });

    document.addEventListener('click', function(e) {
        // Handle Buy Now button clicks
        if (e.target.classList.contains('buy-now')) {
            if (!isLoggedIn) {
                showTempNotification('Veuillez vous connecter pour acheter', 'info', 3000);
                e.preventDefault();
                return;
            }
            if (e.target.dataset.productName) {
                e.preventDefault();
                const productName = e.target.dataset.productName;
                window.location.href = `product.html?name=${encodeURIComponent(productName)}`;
            }
        }
        
        // Make entire product card clickable
        const productCard = e.target.closest('.product-card');
        if (productCard && !e.target.classList.contains('buy-now')) {
            const productName = productCard.querySelector('.product-name')?.textContent;
            if (productName) {
                e.preventDefault();
                window.location.href = `product.html?name=${encodeURIComponent(productName)}`;
            }
        }
    });
}

function checkLoggedInStatus() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.exp * 1000 > Date.now();
    } catch (e) {
        return false;
    }
}

function refreshProductsOnAuthChange() {
    if (document.getElementById('product-table')) {
        fetchProducts();
    }
}