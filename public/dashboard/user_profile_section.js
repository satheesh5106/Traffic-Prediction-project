document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        // Example: Dynamically update username
        const usernameSpan = userInfo.querySelector('span');
        if (usernameSpan) {
            usernameSpan.textContent = `Welcome, ${localStorage.getItem('username') || 'Guest'}!`;
        }

        // Example: Handle logout button click
        const logoutButton = userInfo.querySelector('button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('authToken'); // Clear authentication token
                localStorage.removeItem('username'); // Clear username
                window.location.href = '/authentication/login_component.html'; // Redirect to login page
            });
        }
    }
});