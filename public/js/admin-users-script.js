let allUsers = [];
let filteredUsers = [];
let currentEditingUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    checkAdminAccess();

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
        });
    });

    async function checkAdminAccess() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        try {
            const response = await fetch('/api/auth/check-admin', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.isAdmin) {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Erreur de vérification admin:', error);
            window.location.href = 'index.html';
        }
    }
    
    // Initialize filters and table
    initFilters();
    fetchAllUsers();
    
    // Form submissions
    document.getElementById('addUserForm').addEventListener('submit', addUser);
    document.getElementById('modifyUserForm').addEventListener('submit', updateUser);
    document.getElementById('searchUserBtn').addEventListener('click', searchUser);
    document.getElementById('deleteUserBtn').addEventListener('click', deleteUser);
        
    // Fetch all users from the server
    function fetchAllUsers() {
        fetch('/admin-users')
            .then(response => response.json())
            .then(data => {
                allUsers = data;
                filteredUsers = [...allUsers];
                renderUsersTable(filteredUsers);
                populateRoleFilter();
            })
            .catch(error => console.error('Erreur de récupération des utilisateurs:', error));
    }
    
    // Initialize filters
    function initFilters() {
        const searchFilter = document.getElementById('searchFilter');
        const roleFilter = document.getElementById('roleFilter');
        const sortBy = document.getElementById('sortBy');
        const resetFilters = document.getElementById('resetFilters');

        if (searchFilter) searchFilter.addEventListener('input', applyFilters);
        if (roleFilter) roleFilter.addEventListener('change', applyFilters);
        if (sortBy) sortBy.addEventListener('change', applyFilters);
        if (resetFilters) resetFilters.addEventListener('click', resetFilters);
    }
    
    // Apply filters to users
    function applyFilters() {
        const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        
        // Apply filters
        filteredUsers = allUsers.filter(user => {
            const matchesSearch = 
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm);
            
            const matchesRole = roleFilter ? user.isAdmin.toString() === roleFilter : true;
            
            return matchesSearch && matchesRole;
        });
        
        // Apply sorting
        sortUsers(sortBy);
        
        // Render the filtered and sorted users
        renderUsersTable(filteredUsers);
    }
    
    // Sort users based on selected option
    function sortUsers(sortBy) {
        const [field, direction] = sortBy.split('-');
        
        filteredUsers.sort((a, b) => {
            let comparison = 0;
            
            switch (field) {
                case 'username':
                    comparison = a.username.localeCompare(b.username);
                    break;
                case 'date':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
            }
            
            return direction === 'desc' ? -comparison : comparison;
        });
    }
    
    // Reset all filters
    function resetFilters() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('roleFilter').value = '';
        document.getElementById('sortBy').value = 'username-asc';
        
        filteredUsers = [...allUsers];
        renderUsersTable(filteredUsers);
    }
    
    // Populate role filter with unique roles
    function populateRoleFilter() {
        const roleFilter = document.getElementById('roleFilter');
        // Already has static options
    }
    
    // Render users table
    function renderUsersTable(users) {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        
        if (users.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5" class="no-results">Aucun utilisateur trouvé</td>';
            tbody.appendChild(tr);
            return;
        }
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.isAdmin ? 'Admin' : 'Utilisateur'}</td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Add new user
    function addUser(e) {
        e.preventDefault();
        
        const username = document.getElementById('addUsername').value;
        const email = document.getElementById('addEmail').value;
        const phone = document.getElementById('addPhone').value;
        const password = document.getElementById('addPassword').value;
        const isAdmin = document.getElementById('addIsAdmin').value === 'true';
        
        fetch('/admin-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                phone,
                password,
                isAdmin
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Erreur: ' + data.error);
            } else {
                alert('Utilisateur ajouté avec succès');
                document.getElementById('addUserForm').reset();
                fetchAllUsers();
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'ajout de l\'utilisateur');
        });
    }
    
    // Search for user to modify
    function searchUser() {
        const searchTerm = document.getElementById('searchUserTerm').value.trim();
        if (!searchTerm) return;
        
        fetch(`/admin-users/search?term=${encodeURIComponent(searchTerm)}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else if (data.length === 0) {
                    alert('Aucun utilisateur trouvé');
                } else {
                    const user = data[0]; // Get the first match
                    currentEditingUserId = user._id;
                    populateModifyForm(user);
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                alert('Erreur lors de la recherche d\'utilisateur');
            });
    }
    
    // Populate modify form with user data
    function populateModifyForm(user) {
        document.getElementById('modifyUserForm').style.display = 'block';
        document.getElementById('modifyUsername').value = user.username;
        document.getElementById('modifyEmail').value = user.email;
        document.getElementById('modifyPhone').value = user.phone || '';
        document.getElementById('modifyIsAdmin').value = user.isAdmin;
        document.getElementById('modifyCreatedAt').value = new Date(user.createdAt).toLocaleString();
        document.getElementById('modifyPassword').value = '';
    }
    
    // Update updateUser function
    function updateUser(e) {
        e.preventDefault();
        
        if (!currentEditingUserId) return;
        
        const username = document.getElementById('modifyUsername').value;
        const email = document.getElementById('modifyEmail').value;
        const phone = document.getElementById('modifyPhone').value;
        const password = document.getElementById('modifyPassword').value;
        const isAdmin = document.getElementById('modifyIsAdmin').value === 'true';
        
        const updateData = {
            username,
            email,
            phone,
            isAdmin
        };
        
        // Only include password if it's not empty
        if (password) {
            updateData.password = password;
        }
        
        fetch(`/admin-users/${currentEditingUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Erreur: ' + data.error);
            } else {
                alert('Utilisateur mis à jour avec succès');
                fetchAllUsers();
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de la mise à jour de l\'utilisateur');
        });
    }
    
    // Delete user
    function deleteUser() {
        if (!currentEditingUserId || !confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
        
        fetch(`/admin-users/${currentEditingUserId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Erreur: ' + data.error);
            } else {
                alert('Utilisateur supprimé avec succès');
                document.getElementById('modifyUserForm').style.display = 'none';
                document.getElementById('searchUserTerm').value = '';
                currentEditingUserId = null;
                fetchAllUsers();
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression de l\'utilisateur');
        });
    }

    // Add to the tab switching section
// Add this near the top with other global variables
let allPendingUsers = [];
let filteredPendingUsers = [];

// Add this to the tab switching section
const pendingUsersTab = document.getElementById('pendingUsersTab');
if (pendingUsersTab) {
    pendingUsersTab.addEventListener('click', () => {
        fetchPendingUsers();
    });
}

if (document.querySelector('.tab-btn.active').id === 'pendingUsersTab') {
    fetchPendingUsers();
}

// Make sure this function is properly defined
async function fetchPendingUsers() {
    try {
        const response = await fetch('/admin-users/pending');
        const data = await response.json();
        
        allPendingUsers = data;
        filteredPendingUsers = [...allPendingUsers];
        renderPendingUsersTable(filteredPendingUsers);
        initPendingFilters();
    } catch (error) {
        console.error('Erreur de récupération des utilisateurs en attente:', error);
        alert('Erreur de chargement des utilisateurs en attente');
    }
}

// Add this new function to render pending users table
function renderPendingUsersTable(users) {
    const tbody = document.querySelector('#pendingUsersTable tbody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="no-results">Aucun utilisateur en attente trouvé</td>';
        tbody.appendChild(tr);
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td class="action-buttons">
                <button class="btn-accept" data-id="${user._id}">Accepter</button>
                <button class="btn-reject" data-id="${user._id}">Rejeter</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', approveUser);
    });
    
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', rejectUser);
    });
}

// Add this new function to initialize pending filters
function initPendingFilters() {
    const pendingSearchFilter = document.getElementById('pendingSearchFilter');
    const resetPendingFilters = document.getElementById('resetPendingFilters');
    
    if (pendingSearchFilter) {
        pendingSearchFilter.addEventListener('input', applyPendingFilters);
    }
    if (resetPendingFilters) {
        resetPendingFilters.addEventListener('click', resetPendingFilters);
    }
}

// Add this new function to apply pending filters
function applyPendingFilters() {
    const searchTerm = document.getElementById('pendingSearchFilter').value.toLowerCase();
    
    filteredPendingUsers = allPendingUsers.filter(user => {
        return user.username.toLowerCase().includes(searchTerm) ||
               user.email.toLowerCase().includes(searchTerm);
    });
    
    renderPendingUsersTable(filteredPendingUsers);
}

// Add this new function to reset pending filters
function resetPendingFilters() {
    document.getElementById('pendingSearchFilter').value = '';
    filteredPendingUsers = [...allPendingUsers];
    renderPendingUsersTable(filteredPendingUsers);
}

// Add this new function to approve a user
// Update the approveUser function
async function approveUser(e) {
    const userId = e.target.getAttribute('data-id');
    if (!userId || !confirm('Approuver cet utilisateur ?')) return;
    
    try {
        const response = await fetch(`/admin-users/pending/${userId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Échec de l\'approbation de l\'utilisateur');
        }

        alert(data.message || 'Utilisateur approuvé avec succès');
        fetchPendingUsers();
        fetchAllUsers();

    } catch (error) {
        console.error('Erreur d\'approbation:', error);
        alert(error.message || 'Erreur lors de l\'approbation de l\'utilisateur');
    }
}

// Add this new function to reject a user
function rejectUser(e) {
    const userId = e.target.getAttribute('data-id');
    if (!userId || !confirm('Rejeter cet utilisateur ?')) return;
    
    fetch(`/admin-users/pending/${userId}/reject`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Erreur: ' + data.error);
        } else {
            alert('Utilisateur rejeté avec succès');
            fetchPendingUsers();
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors du rejet de l\'utilisateur');
    });
}

});