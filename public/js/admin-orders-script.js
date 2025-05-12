document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!token || !isAdmin) {
        // Redirect to home page if not admin
        window.location.href = '/index.html';
        return;
    }
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.id.replace('Tab', 'Section');
            document.getElementById(tabId).classList.add('active');
            
            // Load appropriate data when tab is clicked
            switch(tabId) {
                case 'allOrdersSection':
                    fetchAllOrders();
                    break;
                case 'pendingOrdersSection':
                    fetchPendingOrders();
                    break;
                case 'completedOrdersSection':
                    fetchCompletedOrders();
                    break;
            }
        });
    });
    
    // Initialize filters
    initFilters();
    
    // Fetch initial data
    fetchAllOrders();
    
    // Global variables
    let allOrders = [];
    let filteredOrders = [];
    
    // Initialize filters
    function initFilters() {
        // All orders filters
        document.getElementById('searchFilter').addEventListener('input', applyFilters);
        document.getElementById('statusFilter').addEventListener('change', applyFilters);
        document.getElementById('dateFilter').addEventListener('change', applyFilters);
        document.getElementById('resetFilters').addEventListener('click', resetFilters);
        
        // Pending orders filters
        document.getElementById('pendingSearchFilter').addEventListener('input', applyPendingFilters);
        document.getElementById('resetPendingFilters').addEventListener('click', resetPendingFilters);
        
        // Completed orders filters
        document.getElementById('completedSearchFilter').addEventListener('input', applyCompletedFilters);
        document.getElementById('resetCompletedFilters').addEventListener('click', resetCompletedFilters);
    }
    
    // Fetch all orders
    function fetchAllOrders() {
        const token = localStorage.getItem('token');
        
        fetch('/admin-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                // If unauthorized, redirect to login
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            allOrders = data;
            filteredOrders = [...allOrders];
            renderOrdersTable(filteredOrders, 'ordersTable');
        })
        .catch(error => console.error('Erreur de récupération des commandes:', error));
    }
    
    // Fetch pending orders
    function fetchPendingOrders() {
        const token = localStorage.getItem('token');
        
        fetch('/admin-orders?status=pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                // If unauthorized, redirect to login
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            allOrders = data;
            filteredOrders = [...allOrders];
            renderOrdersTable(filteredOrders, 'pendingOrdersTable');
        })
        .catch(error => console.error('Erreur de récupération des commandes en attente:', error));
    }
    
    // Fetch completed orders
    function fetchCompletedOrders() {
        const token = localStorage.getItem('token');
        
        fetch('/admin-orders?status=completed', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                // If unauthorized, redirect to login
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            allOrders = data;
            filteredOrders = [...allOrders];
            renderOrdersTable(filteredOrders, 'completedOrdersTable');
        })
        .catch(error => console.error('Erreur de récupération des commandes complétées:', error));
    }
    
    // Apply filters to all orders
    function applyFilters() {
        const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        const now = new Date();
        let startDate;
        
        switch(dateFilter) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = null;
        }
        
        filteredOrders = allOrders.filter(order => {
            // Search filter
            const matchesSearch = 
                order.userName.toLowerCase().includes(searchTerm) ||
                order.userEmail.toLowerCase().includes(searchTerm) ||
                order._id.toLowerCase().includes(searchTerm);
            
            // Status filter
            const matchesStatus = statusFilter ? order.status === statusFilter : true;
            
            // Date filter
            let matchesDate = true;
            if (startDate) {
                const orderDate = new Date(order.createdAt);
                matchesDate = orderDate >= startDate;
            }
            
            return matchesSearch && matchesStatus && matchesDate;
        });
        
        renderOrdersTable(filteredOrders, 'ordersTable');
    }
    
    // Apply filters to pending orders
    function applyPendingFilters() {
        const searchTerm = document.getElementById('pendingSearchFilter').value.toLowerCase();
        
        filteredOrders = allOrders.filter(order => {
            return order.userName.toLowerCase().includes(searchTerm) ||
                   order.userEmail.toLowerCase().includes(searchTerm) ||
                   order._id.toLowerCase().includes(searchTerm);
        });
        
        renderOrdersTable(filteredOrders, 'pendingOrdersTable');
    }
    
    // Apply filters to completed orders
    function applyCompletedFilters() {
        const searchTerm = document.getElementById('completedSearchFilter').value.toLowerCase();
        
        filteredOrders = allOrders.filter(order => {
            return order.userName.toLowerCase().includes(searchTerm) ||
                   order.userEmail.toLowerCase().includes(searchTerm) ||
                   order._id.toLowerCase().includes(searchTerm);
        });
        
        renderOrdersTable(filteredOrders, 'completedOrdersTable');
    }
    
    // Reset all filters
    function resetFilters() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('dateFilter').value = 'all';
        
        filteredOrders = [...allOrders];
        renderOrdersTable(filteredOrders, 'ordersTable');
    }
    
    // Reset pending filters
    function resetPendingFilters() {
        document.getElementById('pendingSearchFilter').value = '';
        filteredOrders = [...allOrders];
        renderOrdersTable(filteredOrders, 'pendingOrdersTable');
    }
    
    // Reset completed filters
    function resetCompletedFilters() {
        document.getElementById('completedSearchFilter').value = '';
        filteredOrders = [...allOrders];
        renderOrdersTable(filteredOrders, 'completedOrdersTable');
    }
    
    // Render orders table
    function renderOrdersTable(orders, tableId) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6" class="no-results">Aucune commande trouvée</td>';
            tbody.appendChild(tr);
            return;
        }
        
        orders.forEach(order => {
            const mainRow = document.createElement('tr');
            mainRow.className = 'order-main-row';
            mainRow.dataset.orderId = order._id;
            
            // Only show complete button in pending orders table
            const showCompleteButton = tableId === 'pendingOrdersTable';
            
            mainRow.innerHTML = `
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                <td>${order.userName}</td>
                <td>${order.userEmail}</td>
                <td>${order.totalAmount.toFixed(2)} DZD</td>
                <td class="status-cell">
                    <span class="status-${order.status}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                </td>
                <td class="action-buttons">
                    ${showCompleteButton ? 
                        `<button class="btn btn-sm btn-success complete-order" data-id="${order._id}">Compléter</button>` : 
                        ''}
                    <button class="btn btn-sm btn-view toggle-details" data-id="${order._id}">Voir détails</button>
                    <button class="btn btn-sm btn-danger delete-order" data-id="${order._id}">Supprimer</button>
                </td>
            `;
            
            tbody.appendChild(mainRow);
            
            // Event listeners remain the same
            const completeBtn = mainRow.querySelector('.complete-order');
            const deleteBtn = mainRow.querySelector('.delete-order');
            const toggleBtn = mainRow.querySelector('.toggle-details');
            
            if (completeBtn) {
                completeBtn.addEventListener('click', completeOrder);
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', deleteOrder);
            }
            
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const orderId = toggleBtn.getAttribute('data-id');
                    const detailsRow = document.querySelector(`tr.order-details-row[data-order-id="${orderId}"]`);
                    
                    if (detailsRow) {
                        detailsRow.classList.toggle('visible');
                        toggleBtn.textContent = detailsRow.classList.contains('visible') ? 'Masquer détails' : 'Voir détails';
                    } else {
                        showOrderDetails(order, mainRow, toggleBtn);
                    }
                });
            }
        });
    }

    // New function to show order details
    function showOrderDetails(order, mainRow, toggleBtn) {
        const tbody = mainRow.closest('tbody');
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'order-details-row';
        detailsRow.dataset.orderId = order._id;
        
        detailsRow.innerHTML = `
            <td colspan="6">
                <div class="order-details-container">
                    <div class="order-details-section">
                        <h4>Articles commandés</h4>
                        <div class="order-items">
                            ${order.items.map(item => `
                                ${item.variants.map(variant => `
                                    <div class="order-item">
                                        <div class="item-image">
                                            <img src="images/products/${item.image || '/images/default-product.png'}" alt="${variant.variantName}" 
                                                onerror="this.src='/images/default-product.png'">
                                        </div>
                                        <div class="item-info">
                                            <div class="variant-name">${variant.variantName}</div>
                                            <div class="item-price">${variant.price.toFixed(2)} DZD × ${variant.quantity}</div>
                                        </div>
                                        <div class="item-total">${(variant.price * variant.quantity).toFixed(2)} DZD</div>
                                    </div>
                                `).join('')}
                            `).join('')}
                        </div>
                        <div class="order-total">
                            <strong>Total: ${order.totalAmount.toFixed(2)} DZD</strong>
                        </div>
                    </div>
                    
                    <div class="order-details-section">
                        <h4>Informations client</h4>
                        <div class="shipping-info">
                            <p><strong>Nom:</strong> ${order.userName}</p>
                            <p><strong>Email:</strong> ${order.userEmail}</p>
                            <p><strong>Téléphone:</strong> ${order.userPhone || 'Non fourni'}</p>
                        </div>
                    </div>
                </div>
            </td>
        `;
        
        tbody.insertBefore(detailsRow, mainRow.nextSibling);
        toggleBtn.textContent = 'Masquer détails';
        setTimeout(() => {
            detailsRow.classList.add('visible');
        }, 10);
    }
        
    // Complete an order
    function completeOrder(e) {
        const orderId = e.target.getAttribute('data-id');
        if (!orderId || !confirm('Marquer cette commande comme complétée ?')) return;
        
        const token = localStorage.getItem('token');
        
        fetch(`/admin-orders/${orderId}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Handle case where we redirected
            
            if (data.error) {
                alert('Erreur: ' + data.error);
            } else {
                alert('Commande marquée comme complétée');
                // Refresh the appropriate table based on current tab
                const activeTab = document.querySelector('.tab-btn.active').id;
                switch(activeTab) {
                    case 'allOrdersTab':
                        fetchAllOrders();
                        break;
                    case 'pendingOrdersTab':
                        fetchPendingOrders();
                        break;
                    case 'completedOrdersTab':
                        fetchCompletedOrders();
                        break;
                }
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de la complétion de la commande');
        });
    }

    // Delete an order
    function deleteOrder(e) {
        const orderId = e.target.getAttribute('data-id');
        if (!orderId || !confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;
        
        const token = localStorage.getItem('token');
        
        fetch(`/admin-orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return; // Handle case where we redirected
            
            if (data.error) {
                alert('Erreur: ' + data.error);
            } else {
                alert('Commande supprimée avec succès');
                // Refresh the appropriate table based on current tab
                const activeTab = document.querySelector('.tab-btn.active').id;
                switch(activeTab) {
                    case 'allOrdersTab':
                        fetchAllOrders();
                        break;
                    case 'pendingOrdersTab':
                        fetchPendingOrders();
                        break;
                    case 'completedOrdersTab':
                        fetchCompletedOrders();
                        break;
                }
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression de la commande');
        });
    }
});