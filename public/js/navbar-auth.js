document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');

  if (token) {
    // User is logged in
    loginLink.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    // User is not logged in
    loginLink.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }

  // Handle logout
  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'index.html'; // Redirect to homepage
  });
});
