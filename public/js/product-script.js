// Notification function at the top
function showNotification(message, type = 'info') {
    const notification = document.getElementById('temp-notification');
    const icon = document.getElementById('notification-icon');
    const msg = document.getElementById('notification-message');
    
    icon.className = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-circle' : 
                    'fas fa-info-circle';
    
    msg.textContent = message;
    notification.className = `temp-notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
    
    notification.onclick = () => notification.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productName = urlParams.get('name');

    if (productName) {
        fetchProductDetails(productName);
    } else {
        document.getElementById('sliderContainer').innerHTML =
            '<div class="no-images">Aucun produit spécifié</div>';
    }

    if (isLoggedIn()) {
        updateCartCount();
    }
});

async function fetchProductDetails(productName) {
    try {
        const response = await fetch(`/api/products/name/${encodeURIComponent(productName)}`);

        if (!response.ok) {
            throw new Error('Produit non trouvé');
        }

        const product = await response.json();
        displayProductDetails(product);
        setupAddToCartHandler(product);
        initImageSlider();
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('sliderContainer').innerHTML = `
            <div class="no-images">Erreur de chargement du produit: ${error.message}</div>
        `;
    }
}

function displayProductDetails(product) {
    // Set basic product information
    document.getElementById('productNameDisplay').textContent = product.name;
    document.getElementById('productCategoryDisplay').textContent = `Produits / ${product.category}`;

    // Set product description if available
    if (product.description) {
        document.getElementById('productDescriptionDisplay').textContent = product.description;
    }

    // Update availability display
    const isAvailable = product.variants.some(v => v.available);
    const availabilityDisplay = document.getElementById('availabilityDisplay');
    const availabilityText = document.getElementById('availabilityText');
    availabilityText.textContent = isAvailable ? 'En stock' : 'Non disponible';
    availabilityDisplay.className = 'product-availability ' + (isAvailable ? 'available' : 'not-available');

    // Clear existing attribute selections
    const attributeContainer = document.getElementById('attributeSelections');
    attributeContainer.innerHTML = '';

    // Remove old quantity selector if exists
    const oldQuantitySelector = document.querySelector('.quantity-selector');
    if (oldQuantitySelector) oldQuantitySelector.remove();

    // Add variant information lines under product name
    const productInfoContainer = document.querySelector('.product-info');
    const variantInfoContainer = document.createElement('div');
    variantInfoContainer.className = 'variant-info-container';
    
    // Line 1: Variant legend
    const legendLine = document.createElement('div');
    legendLine.className = 'variant-legend';
    legendLine.innerHTML = `
        Variants : <span class="availability-legend"><span class="unavailable-marker"></span> : Non disponible</span>
    `;
    variantInfoContainer.appendChild(legendLine);
    
    // Line 2: All variants display
    const allVariantsLine = document.createElement('div');
    allVariantsLine.className = 'all-variants-line';
    
    product.variants.forEach(variant => {
        const variantTag = document.createElement('span');
        variantTag.className = `variant-tag ${variant.available ? '' : 'unavailable'}`;
        variantTag.textContent = variant.name;
        allVariantsLine.appendChild(variantTag);
    });
    
    variantInfoContainer.appendChild(allVariantsLine);
    
    // Insert after product name
    const productName = document.querySelector('.product-title');
    productName.insertAdjacentElement('afterend', variantInfoContainer);

    // Create variant selection rows
    createVariantSelectionRows(product, attributeContainer);

    // Display images
    const sliderContainer = document.getElementById('sliderContainer');
    const thumbnailsContainer = document.getElementById('thumbnailsContainer');
    sliderContainer.innerHTML = '';
    thumbnailsContainer.innerHTML = '';

    if (product.images && product.images.length > 0) {
        product.images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'slider-slide';
            slide.dataset.index = index;

            const img = document.createElement('img');
            img.className = 'slider-image';
            img.src = `/images/products/${image}`;
            img.alt = `${product.name} - Image ${index + 1}`;
            img.loading = 'lazy';
            img.onclick = () => openZoomModal(img.src);
            slide.appendChild(img);
            sliderContainer.appendChild(slide);

            const thumbnail = document.createElement('img');
            thumbnail.className = 'thumbnail';
            thumbnail.src = `/images/products/${image}`;
            thumbnail.alt = `Miniature ${index + 1}`;
            thumbnail.dataset.index = index;
            thumbnailsContainer.appendChild(thumbnail);
        });

        document.querySelector('.slider-slide').classList.add('active');
        document.querySelector('.thumbnail').classList.add('active');
    } else {
        sliderContainer.innerHTML = '<div class="no-images">Aucune image disponible</div>';
    }
}

function createVariantSelectionRows(product, container) {
    const rowsWrapper = document.createElement('div');
    rowsWrapper.className = 'variant-rows-wrapper';
    container.appendChild(rowsWrapper);

    // Add first variant row
    addVariantSelectionRow(product, rowsWrapper, 0);

    // Add "Add Variant" button if there are multiple available variants
    const availableVariants = product.variants.filter(v => v.available);
    if (availableVariants.length > 1) {
        const addButtonContainer = document.createElement('div');
        addButtonContainer.className = 'add-variant-btn-container';
        
        const addVariantBtn = document.createElement('button');
        addVariantBtn.type = 'button';
        addVariantBtn.className = 'add-variant-btn';
        addVariantBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter une variante';
        
        addVariantBtn.onclick = () => {
            const currentRows = rowsWrapper.querySelectorAll('.variant-row');
            if (currentRows.length < availableVariants.length) {
                addVariantSelectionRow(product, rowsWrapper, currentRows.length);
                if (currentRows.length + 1 >= availableVariants.length) {
                    addVariantBtn.style.display = 'none';
                }
            }
        };
        
        addButtonContainer.appendChild(addVariantBtn);
        container.appendChild(addButtonContainer);
    }
}

function addVariantSelectionRow(product, container, index) {
    const row = document.createElement('div');
    row.className = 'variant-row';
    
    const variantSelect = document.createElement('select');
    variantSelect.className = 'variant-select';
    variantSelect.required = true;
    
    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Sélectionner une variante';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    variantSelect.appendChild(defaultOption);
    
    // Add available variants that haven't been selected yet
    const selectedVariants = getSelectedVariants(container);
    
    product.variants.forEach(variant => {
        // Only show available variants that haven't been selected yet
        if (variant.available && !selectedVariants.includes(variant.name)) {
            const option = document.createElement('option');
            option.value = variant.name;
            option.textContent = `${variant.name} - ${variant.price} DA`;
            option.dataset.price = variant.price;
            variantSelect.appendChild(option);
        }
    });

    // If no options available (all variants selected), show message
    if (variantSelect.options.length === 1) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Toutes les variantes sélectionnées';
        option.disabled = true;
        variantSelect.appendChild(option);
    }
    
    const priceDisplay = document.createElement('div');
    priceDisplay.className = 'variant-price';
    priceDisplay.textContent = '0 DA';
    
    const quantityDiv = document.createElement('div');
    quantityDiv.className = 'variant-quantity';
    
    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'quantity-btn';
    minusBtn.textContent = '-';
    minusBtn.onclick = () => changeVariantQuantity(row, -1);
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'quantity-input';
    quantityInput.value = '1';
    quantityInput.min = '1';
    quantityInput.onchange = () => validateVariantQuantity(quantityInput);
    
    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'quantity-btn';
    plusBtn.textContent = '+';
    plusBtn.onclick = () => changeVariantQuantity(row, 1);
    
    quantityDiv.appendChild(minusBtn);
    quantityDiv.appendChild(quantityInput);
    quantityDiv.appendChild(plusBtn);
    
    // Remove button for additional rows
    if (index > 0) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-variant-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => {
            row.remove();
            updateAllVariantSelects(container.parentElement);
            const addBtn = container.parentElement.querySelector('.add-variant-btn');
            if (addBtn) {
                addBtn.style.display = 'block';
                // Check if we've reached max variants again
                const currentRows = container.querySelectorAll('.variant-row');
                if (currentRows.length >= product.variants.filter(v => v.available).length) {
                    addBtn.style.display = 'none';
                }
            }
        };
        row.appendChild(removeBtn);
    }
    
    row.appendChild(variantSelect);
    row.appendChild(priceDisplay);
    row.appendChild(quantityDiv);
    
    // Update variant selection when changed
    variantSelect.addEventListener('change', function() {
        updateAllVariantSelects(container.parentElement);
        const selectedOption = this.options[this.selectedIndex];
        const price = selectedOption.dataset.price || '0';
        priceDisplay.textContent = `${price} DA`;
    });
    
    container.appendChild(row);
}

function getSelectedVariants(container) {
    const selected = [];
    const selects = container.querySelectorAll('.variant-select');
    selects.forEach(select => {
        if (select.value) {
            selected.push(select.value);
        }
    });
    return selected;
}

function updateAllVariantSelects(container) {
    const rowsWrapper = container.querySelector('.variant-rows-wrapper');
    const selects = rowsWrapper.querySelectorAll('.variant-select');
    const selectedVariants = getSelectedVariants(rowsWrapper);
    
    selects.forEach(select => {
        const currentValue = select.value;
        const options = Array.from(select.options);
        
        // Reset all options except the default one
        options.forEach(option => {
            if (option.value && option.value !== '') {
                option.disabled = selectedVariants.includes(option.value) && option.value !== currentValue;
            }
        });
        
        // If current selection is now disabled (selected in another row), reset it
        if (currentValue && selectedVariants.filter(v => v === currentValue).length > 1) {
            select.value = '';
            const priceDisplay = select.closest('.variant-row').querySelector('.variant-price');
            priceDisplay.textContent = '0 DA';
        }
    });
    
    // Show/hide add variant button based on remaining available variants
    const addBtn = container.querySelector('.add-variant-btn');
    if (addBtn) {
        const availableVariants = Array.from(container.querySelectorAll('.variant-select option'))
            .filter(opt => opt.value && !opt.disabled);
        addBtn.style.display = availableVariants.length > 0 ? 'block' : 'none';
    }
}

function changeVariantQuantity(row, amount) {
    const quantityInput = row.querySelector('.quantity-input');
    let newValue = parseInt(quantityInput.value) + amount;
    newValue = Math.max(1, newValue);
    quantityInput.value = newValue;
}

function validateVariantQuantity(input) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < 1) {
        input.value = '1';
    }
}

function setupAddToCartHandler(product) {

    const form = document.getElementById('productForm');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const addToCartBtn = document.getElementById('addToCartBtn');
        const originalBtnText = addToCartBtn.innerHTML;

        try {
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout en cours...';

            if (!isLoggedIn()) {
                showNotification('Veuillez vous connecter pour ajouter des articles au panier', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
                }, 1500);
                return;
            }

            // Collect all selected variants
            const variantRows = document.querySelectorAll('.variant-row');
            const selectedVariants = [];
            let hasInvalidSelection = false;
            
            variantRows.forEach(row => {
                const select = row.querySelector('.variant-select');
                const selectedOption = select.options[select.selectedIndex];
                
                if (!selectedOption.value) {
                    hasInvalidSelection = true;
                    select.classList.add('error');
                } else {
                    select.classList.remove('error');
                    const quantityInput = row.querySelector('.quantity-input');
                    const quantity = parseInt(quantityInput.value) || 1;
                    
                    selectedVariants.push({
                        variantName: selectedOption.value,
                        price: parseFloat(selectedOption.dataset.price),
                        quantity: quantity
                    });
                }
            });

            if (hasInvalidSelection) {
                throw new Error('Veuillez sélectionner une variante pour chaque ligne');
            }

            if (selectedVariants.length === 0) {
                throw new Error('Veuillez sélectionner au moins une variante');
            }

            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    productId: product._id,
                    productName: product.name,
                    variants: selectedVariants,
                    image: product.images?.[0] || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de l\'ajout au panier');
            }

            showNotification('Produit ajouté au panier!', 'success');
            updateCartCount();

        } catch (error) {
            console.error('Erreur lors de l\'ajout au panier:', error);
            showNotification(error.message, 'error');
            
            if (error.message.includes('authentication') || error.message.includes('token')) {
                localStorage.removeItem('token');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } finally {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = originalBtnText || 'Ajouter au panier';
        }
    });
}


function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    if (cartCountElements.length > 0) {
        fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => response.json())
            .then(cart => {
                const itemCount = cart.items?.reduce((total, item) => total + item.quantity, 0) || 0;
                cartCountElements.forEach(el => {
                    el.textContent = itemCount;
                    el.style.display = itemCount > 0 ? 'flex' : 'none';
                });
            })
            .catch(console.error);
    }
}

function initImageSlider() {
    const slides = document.querySelectorAll('.slider-slide');
    const thumbnails = document.querySelectorAll('.thumbnail');
    let currentIndex = 0;
    let slideInterval;

    if (slides.length <= 1) {
        document.getElementById('thumbnailsContainer').style.display = 'none';
        return;
    }

    const showSlide = (index) => {
        slides.forEach(slide => slide.classList.remove('active'));
        thumbnails.forEach(thumb => thumb.classList.remove('active'));

        slides[index].classList.add('active');
        thumbnails[index].classList.add('active');
        currentIndex = index;

        thumbnails[index].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    };

    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            showSlide(index);
            resetInterval();
        });
    });

    const nextSlide = () => {
        const newIndex = (currentIndex + 1) % slides.length;
        showSlide(newIndex);
    };

    const resetInterval = () => {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000);
    };

    resetInterval();

    const sliderWrapper = document.querySelector('.slider-wrapper');
    sliderWrapper.addEventListener('mouseenter', () => {
        clearInterval(slideInterval);
    });

    sliderWrapper.addEventListener('mouseleave', resetInterval);
}

function openZoomModal(imageSrc) {
    const modal = document.getElementById('zoomModal');
    const zoomedImg = document.getElementById('zoomedImage');

    if (!modal || !zoomedImg) return;

    zoomedImg.src = imageSrc;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeZoom() {
    const modal = document.getElementById('zoomModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function isLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.exp * 1000 > Date.now();
    } catch (e) {
        return false;
    }
}