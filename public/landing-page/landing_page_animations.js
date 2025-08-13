document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = 0;
        container.style.transform = 'translateY(20px)';
        setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            container.style.opacity = 1;
            container.style.transform = 'translateY(0)';
        }, 100);
    }
});