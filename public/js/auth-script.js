// Simple JWT decode function
function decodeJWT(token) {
  try {
      return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
      return null;
  }
}

// Check if user is logged in
function isLoggedIn() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  const decoded = decodeJWT(token);
  if (!decoded) return false;
  
  return decoded.exp * 1000 > Date.now();
}

// Check if user is an admin
function isAdmin() {
  return localStorage.getItem('isAdmin') === 'true' && isLoggedIn();
}

// Redirect if logged in
function checkLoginPageAccess() {
  if (window.location.pathname.includes('login.html') && isLoggedIn()) {
      window.location.href = 'index.html';
  }
}

function getInitials(name) {
  if (!name) return '';
  return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
}

// Update navbar based on auth state
function updateNavbarAuthState() {
  const loginBtn = document.getElementById('login-button');
  const userProfile = document.getElementById('user-profile');
  const userCircle = document.getElementById('user-circle');
  const userInitials = document.getElementById('user-initials');
  const userFullname = document.getElementById('user-fullname');
  const adminLinks = document.querySelectorAll('.admin-link');
  
  if (isLoggedIn()) {
      const username = localStorage.getItem('username') || 'User';
      const isAdminUser = isAdmin();
      
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      if (userInitials) userInitials.textContent = getInitials(username);
      if (userFullname) userFullname.textContent = username;
      
      // Show/hide admin links based on admin status
      adminLinks.forEach(link => {
          link.style.display = isAdminUser ? 'block' : 'none';
      });
  } else {
      if (loginBtn) loginBtn.style.display = 'flex';
      if (userProfile) userProfile.style.display = 'none';
      
      // Hide all admin links if not logged in
      adminLinks.forEach(link => {
          link.style.display = 'none';
      });
  }
}

// Logout function
async function handleLogout() {
  try {
      await fetch('/api/auth/logout', { method: 'GET' });
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('isAdmin');
      updateNavbarAuthState();
      window.location.href = 'index.html';
  } catch (err) {
      console.error('Logout error:', err);
      alert('Logout failed. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Check login page access first
  checkLoginPageAccess();
  
  // Update navbar state
  updateNavbarAuthState();

  // DOM elements
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authContents = document.querySelectorAll('.auth-content');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const showForgotPassword = document.getElementById('show-forgot-password');

  // Tab switching
  function switchTab(tabName) {
      authTabs.forEach(tab => {
          tab.classList.remove('active');
          if (tab.getAttribute('data-tab') === tabName) {
              tab.classList.add('active');
          }
      });

      authContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `${tabName}-content`) {
              content.classList.add('active');
          }
      });
  }

  // Tab click events
  authTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
          e.preventDefault();
          const tabName = tab.getAttribute('data-tab');
          switchTab(tabName);
      });
  });

  // Show register/login links
  if (showRegister) {
      showRegister.addEventListener('click', (e) => {
          e.preventDefault();
          switchTab('register');
      });
  }

  if (showLogin) {
      showLogin.addEventListener('click', (e) => {
          e.preventDefault();
          switchTab('login');
      });
  }

  if (showForgotPassword) {
      showForgotPassword.addEventListener('click', (e) => {
          e.preventDefault();
          switchTab('forgot-password');
      });
  }

  // Password visibility toggle
  const passwordToggles = document.querySelectorAll('.password-toggle');
  passwordToggles.forEach(toggle => {
      toggle.addEventListener('click', function () {
          const input = this.previousElementSibling;
          const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
          input.setAttribute('type', type);
          this.classList.toggle('fa-eye-slash');
          this.classList.toggle('fa-eye');
      });
  });

  // Login form submission
  if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const submitBtn = this.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn.innerHTML;
          
          try {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

              const email = document.getElementById('login-email').value;
              const password = document.getElementById('login-password').value;

              if (!email || !password) {
                  showAlert('Please fill in both email and password', 'error');
                  return;
              }

              const response = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email, password })
              });

              const data = await response.json();

              if (response.ok) {
                  localStorage.setItem('token', data.token);
                  localStorage.setItem('userId', data.userId);
                  localStorage.setItem('username', data.username || data.user.name || 'User');
                  localStorage.setItem('isAdmin', data.isAdmin || false);
                  updateNavbarAuthState();
                  
                  // Show success notification
                  const notification = document.getElementById('login-notification');
                  if (notification) {
                      notification.classList.add('success', 'show');
                      notification.querySelector('.temp-notification-message').textContent = data.message || 'Login successful!';
                      
                      // Redirect after the notification is shown
                      setTimeout(() => {
                          window.location.href = data.redirectPath || 'index.html';
                      }, 2000);
                  } else {
                      window.location.href = data.redirectPath || 'index.html';
                  }
              } else {
                  showAlert(data.message || 'Login failed', 'error');
              }
          } catch (err) {
              console.error('Login error:', err);
              showAlert('An error occurred during login', 'error');
          } finally {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
          }
      });
  }

  // Registration submission
  if (registerForm) {
      registerForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          const submitBtn = this.querySelector('button[type="submit"]');
          const originalBtnText = submitBtn.innerHTML;
          
          try {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

              const username = document.getElementById('register-name').value;
              const email = document.getElementById('register-email').value;
              const phone = document.getElementById('register-phone').value;
              const password = document.getElementById('register-password').value;
              const confirmPassword = document.getElementById('register-confirm-password').value;

              if (!username || !email || !phone || !password || !confirmPassword) {
                  showAlert('Please fill in all fields', 'error');
                  return;
              }

              if (password.length < 6) {
                  showAlert('Password must be at least 6 characters', 'error');
                  return;
              }

              if (password !== confirmPassword) {
                  showAlert('Passwords do not match', 'error');
                  return;
              }

              const response = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, email, phone, password })
              });

              const data = await response.json();

              if (response.ok) {
                  showAlert(data.message, 'success');
                  registerForm.reset();
                  switchTab('login');
              } else {
                  showAlert(data.message || 'Registration failed', 'error');
              }
          } catch (err) {
              console.error('Registration error:', err);
              showAlert('An error occurred during registration', 'error');
          } finally {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
          }
      });
  }

  // Logout button event
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleLogout();
      });
  }

  // Add token expiration check every minute
  setInterval(() => {
      if (!isLoggedIn() && !window.location.pathname.includes('login.html')) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('isAdmin');
          updateNavbarAuthState();
      }
  }, 60000);

  // Show alert function
  function showAlert(message, type) {
      // Remove any existing alerts
      const existingAlert = document.querySelector('.custom-alert');
      if (existingAlert) existingAlert.remove();

      const alertDiv = document.createElement('div');
      alertDiv.className = `custom-alert ${type}`;
      alertDiv.textContent = message;
      document.body.appendChild(alertDiv);

      setTimeout(() => {
          alertDiv.remove();
      }, 5000);
  }
});