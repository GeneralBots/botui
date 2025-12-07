/* Home page JavaScript */

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const shortcuts = {
            '1': '#chat',
            '2': '#drive',
            '3': '#tasks',
            '4': '#mail',
            '5': '#calendar',
            '6': '#meet'
        };
        if (shortcuts[e.key]) {
            e.preventDefault();
            const link = document.querySelector(`a[href="${shortcuts[e.key]}"]`);
            if (link) link.click();
        }
    }
});
