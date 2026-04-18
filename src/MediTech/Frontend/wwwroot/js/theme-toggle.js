/**
 * MediTech Theme Toggle Logic
 * Handles the switching between Light and Dark modes using Bootstrap 5.3 data-bs-theme
 */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const htmlElement = document.documentElement;

    // Function to update the icon based on the current theme
    const updateIcon = (theme) => {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    };

    // Initialize icon on load
    const currentTheme = htmlElement.getAttribute('data-bs-theme') || 'light';
    updateIcon(currentTheme);

    // Toggle click event
    themeToggle.addEventListener('click', () => {
        const theme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = theme === 'dark' ? 'light' : 'dark';

        // Update attribute
        htmlElement.setAttribute('data-bs-theme', newTheme);
        
        // Save to localStorage
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        updateIcon(newTheme);

        // Optional: Trigger a custom event for other components to respond
        window.dispatchEvent(new CustomEvent('meditech-theme-changed', { detail: { theme: newTheme } }));
    });
});
