// Add this utility function at the top
function showTempNotification(message, type = 'success', duration = 3000) {
    const notification = document.getElementById('cart-notification');
    if (!notification) return;
    
    // Set message and type
    notification.querySelector('.temp-notification-message').textContent = message;
    notification.className = 'temp-notification'; // Reset classes
    notification.classList.add(type);
    
    // Show notification
    notification.classList.add('show');
    
    // Auto-hide after duration
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
    }, { once: true });
}

document.addEventListener('DOMContentLoaded', function() {
    updateNavbarAuthState();
    
    if (!isLoggedIn()) {
        showTempNotification('Veuillez vous connecter pour accéder à votre panier', 'error', 10000);
        setTimeout(() => {
            window.location.href = 'login.html?returnUrl=' + encodeURIComponent(window.location.pathname);
        }, 10000);
        return;
    }
    
    loadCart();

    // Handle checkout
    document.getElementById('checkoutBtn')?.addEventListener('click', async function() {
        try {
            // Get the current cart data
            const cartResponse = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const cart = await cartResponse.json();
            
            if (!cart.items || cart.items.length === 0) {
                showTempNotification('Votre panier est vide', 'error');
                return;
            }

            // Proceed with checkout
            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cartItems: cart.items
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                showTempNotification('Commande passée avec succès! Notre équipe vous contactera bientôt.', 'success');
                
                // Redirect to order page with order ID
                            // Simply reload the current page to show empty cart
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Échec de la commande');
            }
        } catch (error) {
            console.error('Erreur lors du paiement:', error);
            showTempNotification(error.message, 'error');
        }
    });
});

async function loadCart() {
    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const cart = await response.json();
        displayCart(cart.items || []);
    } catch (error) {
        console.error('Erreur de chargement du panier:', error);
        showTempNotification('Échec du chargement du panier', 'error');
    }
}

function displayCart(items) {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');
    const cartItems = document.getElementById('cartItems');
    
    if (items.length === 0) {
        cartEmpty.style.display = 'block';
        cartContent.style.display = 'none';
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartContent.style.display = 'block';
    
    cartItems.innerHTML = '';
    let total = 0;
    
    items.forEach(item => {
        item.variants.forEach(variant => {
            const row = document.createElement('tr');
            row.dataset.itemId = item._id;
            row.dataset.variantName = variant.variantName;
            
            const variantTotal = variant.price * variant.quantity;
            total += variantTotal;
            
            row.innerHTML = `
                <td>
                    <div class="cart-product">
                        <img src="images/products/${item.image}" alt="${variant.variantName}" width="50">
                        <span>${variant.variantName}</span>
                    </div>
                </td>
                <td>${variant.price.toFixed(0)} DA</td>
                <td>
                    <input type="number" min="1" value="${variant.quantity}" 
                           class="quantity-input" 
                           data-item-id="${item._id}" 
                           data-variant-name="${variant.variantName}">
                </td>
                <td>${variantTotal.toFixed(0)} DA</td>
                <td>
                    <button class="btn-remove" 
                            data-item-id="${item._id}" 
                            data-variant-name="${variant.variantName}">
                        Supprimer
                    </button>
                </td>
            `;
            
            cartItems.appendChild(row);
        });
    });
    
    document.getElementById('cartTotal').textContent = `${total.toFixed(0)} DA`;
    
    // Rest of the event listeners remain the same...
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', async function() {
            const itemId = this.dataset.itemId;
            const variantName = this.dataset.variantName;
            const newQuantity = parseInt(this.value);
            
            if (newQuantity < 1) {
                this.value = 1;
                return;
            }
            
            try {
                const response = await fetch(`/api/cart/${itemId}/variants/${variantName}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ quantity: newQuantity })
                });
                
                if (response.ok) {
                    showTempNotification('Quantité mise à jour', 'success');
                    loadCart();
                } else {
                    throw new Error('Échec de la mise à jour');
                }
            } catch (error) {
                console.error('Erreur de mise à jour:', error);
                showTempNotification(error.message, 'error');
                loadCart();
            }
        });
    });
    
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', async function() {
            const itemId = this.dataset.itemId;
            const variantName = this.dataset.variantName;
            
            try {
                const response = await fetch(`/api/cart/${itemId}/variants/${variantName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    showTempNotification('Article retiré du panier', 'success');
                    loadCart();
                } else {
                    throw new Error('Échec de la suppression');
                }
            } catch (error) {
                console.error('Erreur de suppression:', error);
                showTempNotification(error.message, 'error');
            }
        });
    });
}

// Add this function to handle "Add to Cart" from product pages
async function addToCart(productId, quantity = 1, selectedAttributes = {}, description = '') {
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId,
                quantity,
                selectedAttributes,
                description
            })
        });

        if (response.ok) {
            showTempNotification('Produit ajouté au panier!', 'success');
            return true;
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Échec de l\'ajout au panier');
        }
    } catch (error) {
        console.error('Erreur d\'ajout au panier:', error);
        showTempNotification(error.message, 'error');
        return false;
    }
}