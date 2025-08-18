/**
 * Dashboard JavaScript
 * Handles dashboard functionality including navigation, user profile display, and logout
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Load user profile data
    loadUserProfile();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the dashboard components
 */
function initializeDashboard() {
    // Set active navigation item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update page title
            const featureName = this.getAttribute('data-feature');
            updatePageTitle(featureName);
            
            // Show corresponding content
            showFeatureContent(featureName);
        });
    });
    
    // Initialize mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
}

/**
 * Update the page title based on selected feature
 * @param {string} feature - The selected feature
 */
function updatePageTitle(feature) {
    const pageTitle = document.querySelector('.page-title');
    if (!pageTitle) return;
    
    const titles = {
        'overview': 'Dashboard Overview',
        'prediction': 'Traffic Prediction',
        'routes': 'Route Optimization',
        'analytics': 'Analytics',
        'settings': 'Settings'
    };
    
    pageTitle.textContent = titles[feature] || 'Dashboard';
}

/**
 * Show the content for the selected feature
 * @param {string} feature - The selected feature
 */
function showFeatureContent(feature) {
    // Hide all feature content
    const allContent = document.querySelectorAll('.feature-content');
    allContent.forEach(content => content.classList.remove('active'));
    
    // Show selected feature content
    const selectedContent = document.getElementById(`${feature}-content`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
}

/**
 * Load user profile data from server or local storage
 */
function loadUserProfile() {
    // This would typically be an API call to get user data
    // For demo purposes, we'll use mock data
    const userData = {
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        photoURL: '../assets/avatar.png'
    };
    
    // Update user profile in the UI
    updateUserProfileUI(userData);
}

/**
 * Update the user profile information in the UI
 * @param {Object} user - The user data object
 */
function updateUserProfileUI(user) {
    // Update user name and email in the top navigation
    const userNameElement = document.getElementById('user-display-name');
    const userEmailElement = document.getElementById('user-email');
    
    if (userNameElement && user.displayName) {
        userNameElement.textContent = user.displayName;
    }
    
    if (userEmailElement && user.email) {
        userEmailElement.textContent = user.email;
    }
    
    // Update user info in dropdown
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    
    if (dropdownUserName && user.displayName) {
        dropdownUserName.textContent = user.displayName;
    }
    
    if (dropdownUserEmail && user.email) {
        dropdownUserEmail.textContent = user.email;
    }
    
    // Update avatar if available
    const avatarElements = document.querySelectorAll('.avatar');
    if (user.photoURL) {
        avatarElements.forEach(avatar => {
            avatar.src = user.photoURL;
        });
    }
}

/**
 * Set up event listeners for dashboard interactions
 */
function setupEventListeners() {
    // Logout button event listener
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Profile dropdown toggle
    const userProfile = document.querySelector('.user-profile');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (userProfile && dropdownMenu) {
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!userProfile.contains(event.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
        
        // Toggle dropdown on profile click
        userProfile.addEventListener('click', function(event) {
            event.stopPropagation();
            const isDisplayed = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isDisplayed ? 'none' : 'block';
        });
    }
    
    // Card action buttons
    const actionButtons = document.querySelectorAll('.card-actions button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Handle card actions (refresh, more options, etc.)
            console.log('Card action clicked');
        });
    });
    
    // View details buttons
    const viewDetailsButtons = document.querySelectorAll('.view-details');
    viewDetailsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const cardTitle = this.closest('.visualization-card')
                .querySelector('.card-header h3')
                .textContent;
                
            console.log(`View details clicked for: ${cardTitle}`);
            // Navigate to detailed view or show modal
        });
    });
    
    // Explore map button
    const exploreMapButton = document.querySelector('.explore-map');
    if (exploreMapButton) {
        exploreMapButton.addEventListener('click', function() {
            console.log('Explore map clicked');
            // Open map in fullscreen or navigate to map page
        });
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Clear user session/token
    // This would typically involve an API call to invalidate the session
    
    console.log('Logging out...');
    
    // Clear any user data from local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Redirect to authentication page
    window.location.href = '/auth';
}