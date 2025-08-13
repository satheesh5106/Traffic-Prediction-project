document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Simulate successful login for now
            alert('Login successful! Redirecting to dashboard...');
            window.location.href = '/dashboard/main_dashboard_layout.html'; // Redirect to dashboard
        });
    }
});