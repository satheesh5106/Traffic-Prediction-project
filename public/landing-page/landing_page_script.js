document.addEventListener('DOMContentLoaded', () => {
    const countdownElement = document.getElementById('countdown');
    let timeLeft = 5;

    const countdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownElement) {
            countdownElement.textContent = `Redirecting in ${timeLeft} seconds...`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            window.location.href = '/authentication/login_component.html'; // Redirect to authentication page
        }
    }, 1000);
});