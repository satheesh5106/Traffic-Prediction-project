document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.dashboard-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('href').substring(1);

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });

            // Update active link styling
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');

            // Update dashboard header title
            const headerTitle = document.querySelector('.navbar h1');
            if (headerTitle) {
                headerTitle.textContent = link.textContent + ' Dashboard';
            }
        });
    });

    // Set initial active section and header title
    if (navLinks.length > 0) {
        navLinks[0].click();
    }
});