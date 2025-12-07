/**
 * Sources Module JavaScript
 * Prompts, Templates, MCP Servers & AI Models
 */
(function() {
    'use strict';

    /**
     * Initialize the Sources module
     */
    function init() {
        setupTabNavigation();
        setupCategoryNavigation();
        setupViewToggle();
        setupKeyboardShortcuts();
        setupHTMXEvents();
    }

    /**
     * Set active tab
     */
    window.setActiveTab = function(btn) {
        document.querySelectorAll('.tab-btn').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
    };

    /**
     * Setup tab navigation
     */
    function setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setActiveTab(this);
            });
        });
    }

    /**
     * Setup category navigation
     */
    function setupCategoryNavigation() {
        document.addEventListener('click', function(e) {
            const categoryItem = e.target.closest('.category-item');
            if (categoryItem) {
                document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                categoryItem.classList.add('active');
            }
        });
    }

    /**
     * Setup view toggle (grid/list)
     */
    function setupViewToggle() {
        document.addEventListener('click', function(e) {
            const viewBtn = e.target.closest('.view-btn');
            if (viewBtn) {
                const controls = viewBtn.closest('.view-controls');
                if (controls) {
                    controls.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                    viewBtn.classList.add('active');

                    const grid = document.querySelector('.prompts-grid, .templates-grid, .servers-grid, .models-grid, .news-grid');
                    if (grid) {
                        if (viewBtn.title === 'List view') {
                            grid.classList.add('list-view');
                        } else {
                            grid.classList.remove('list-view');
                        }
                    }
                }
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('.search-box input');
                if (searchInput) searchInput.focus();
            }

            // Tab navigation with number keys
            if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.target.matches('input, textarea')) {
                const tabs = document.querySelectorAll('.tab-btn');
                const num = parseInt(e.key);
                if (num >= 1 && num <= tabs.length) {
                    tabs[num - 1].click();
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                closeModals();
            }
        });
    }

    /**
     * Setup HTMX events
     */
    function setupHTMXEvents() {
        if (typeof htmx === 'undefined') return;

        document.body.addEventListener('htmx:beforeRequest', function(e) {
            if (e.detail.target && e.detail.target.id === 'content-area') {
                e.detail.target.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading...</p>
                    </div>
                `;
            }
        });

        document.body.addEventListener('htmx:afterSwap', function(e) {
            // Re-initialize any dynamic content handlers after content swap
            setupPromptCards();
            setupServerCards();
            setupModelCards();
        });
    }

    /**
     * Setup prompt card interactions
     */
    function setupPromptCards() {
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', function(e) {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.prompt-action-btn')) return;
                
                const promptId = this.dataset.id;
                if (promptId) {
                    showPromptDetail(promptId);
                }
            });
        });

        document.querySelectorAll('.prompt-action-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.title.toLowerCase();
                const card = this.closest('.prompt-card');
                const promptId = card?.dataset.id;

                switch (action) {
                    case 'use':
                        usePrompt(promptId);
                        break;
                    case 'copy':
                        copyPrompt(promptId);
                        break;
                    case 'save':
                        savePrompt(promptId);
                        break;
                }
            });
        });
    }

    /**
     * Setup server card interactions
     */
    function setupServerCards() {
        document.querySelectorAll('.server-card').forEach(card => {
            card.addEventListener('click', function() {
                const serverId = this.dataset.id;
                if (serverId) {
                    showServerDetail(serverId);
                }
            });
        });
    }

    /**
     * Setup model card interactions
     */
    function setupModelCards() {
        document.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', function() {
                const modelId = this.dataset.id;
                if (modelId) {
                    showModelDetail(modelId);
                }
            });
        });
    }

    /**
     * Show prompt detail modal/panel
     */
    function showPromptDetail(promptId) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/sources/prompts/${promptId}`, {
                target: '#prompt-detail-panel',
                swap: 'innerHTML'
            }).then(() => {
                document.getElementById('prompt-detail-panel')?.classList.remove('hidden');
            });
        }
    }

    /**
     * Use a prompt
     */
    function usePrompt(promptId) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('POST', `/api/sources/prompts/${promptId}/use`, {
                swap: 'none'
            }).then(() => {
                // Navigate to the appropriate module
                window.location.hash = '#research';
            });
        }
    }

    /**
     * Copy prompt to clipboard
     */
    function copyPrompt(promptId) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/sources/prompts/${promptId}/content`, {
                swap: 'none'
            }).then(response => {
                // Parse response and copy to clipboard
                navigator.clipboard.writeText(response || '');
                showToast('Prompt copied to clipboard');
            });
        }
    }

    /**
     * Save prompt to collection
     */
    function savePrompt(promptId) {
        const collectionName = prompt('Enter collection name:');
        if (collectionName && typeof htmx !== 'undefined') {
            htmx.ajax('POST', '/api/sources/prompts/save', {
                values: {
                    promptId,
                    collection: collectionName
                }
            }).then(() => {
                showToast('Prompt saved to collection');
            });
        }
    }

    /**
     * Show server detail
     */
    function showServerDetail(serverId) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/sources/mcp-servers/${serverId}`, {
                target: '#server-detail-panel',
                swap: 'innerHTML'
            }).then(() => {
                document.getElementById('server-detail-panel')?.classList.remove('hidden');
            });
        }
    }

    /**
     * Show model detail
     */
    function showModelDetail(modelId) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/sources/models/${modelId}`, {
                target: '#model-detail-panel',
                swap: 'innerHTML'
            }).then(() => {
                document.getElementById('model-detail-panel')?.classList.remove('hidden');
            });
        }
    }

    /**
     * Close all modals
     */
    function closeModals() {
        document.querySelectorAll('.modal, .detail-panel').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external use
    window.Sources = {
        setActiveTab,
        showPromptDetail,
        usePrompt,
        copyPrompt,
        savePrompt,
        showToast
    };
})();
