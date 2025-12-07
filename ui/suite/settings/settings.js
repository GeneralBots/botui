/* Settings Module JavaScript */

(function() {
    'use strict';

    /**
     * Initialize settings module
     */
    function init() {
        bindNavigation();
        bindToggles();
        bindThemeSelector();
        bindAvatarUpload();
        bindFormValidation();
    }

    /**
     * Bind settings navigation
     */
    function bindNavigation() {
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    /**
     * Bind toggle switches
     */
    function bindToggles() {
        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const setting = this.dataset.setting;
                const value = this.checked;
                saveSetting(setting, value);
            });
        });
    }

    /**
     * Bind theme selector
     */
    function bindThemeSelector() {
        document.querySelectorAll('.theme-option input').forEach(option => {
            option.addEventListener('change', function() {
                const theme = this.value;
                document.documentElement.setAttribute('data-theme', theme);
                saveSetting('theme', theme);
            });
        });
    }

    /**
     * Bind avatar upload
     */
    function bindAvatarUpload() {
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.querySelector('.avatar-preview img');
                        if (preview) {
                            preview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    /**
     * Bind form validation
     */
    function bindFormValidation() {
        document.querySelectorAll('.settings-form').forEach(form => {
            form.addEventListener('submit', function(e) {
                const inputs = form.querySelectorAll('[required]');
                let valid = true;
                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        valid = false;
                        input.classList.add('error');
                    } else {
                        input.classList.remove('error');
                    }
                });
                if (!valid) {
                    e.preventDefault();
                }
            });
        });
    }

    /**
     * Save setting (via HTMX or fetch)
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    function saveSetting(key, value) {
        // This would be handled by HTMX in production
        console.log('Saving setting:', key, value);
    }

    // Export for external use
    window.SettingsModule = { init };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
