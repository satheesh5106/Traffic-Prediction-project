document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('passwordResetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Password reset link sent to your email!');
            // In a real application, you would send an API request here
        });
    }
});