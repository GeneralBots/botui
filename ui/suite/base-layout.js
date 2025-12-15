/* =============================================================================
   BOTUI SUITE - BASE LAYOUT JAVASCRIPT
   Sentient Theme with AI Assistant Panel
   ============================================================================= */

(function() {
    'use strict';

    // =============================================================================
    // STATE
    // =============================================================================
    
    const state = {
        aiPanelOpen: true,
        currentApp: 'dashboard',
        messages: []
    };

    // =============================================================================
    // AI PANEL
    // =============================================================================

    window.toggleAIPanel = function() {
        const panel = document.getElementById('ai-panel');
        if (panel) {
            panel.classList.toggle('open');
            state.aiPanelOpen = panel.classList.contains('open');
        }
    };

    window.sendAIMessage = function() {
        const input = document.getElementById('ai-input');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';

        addMessage('user', message);
        showTypingIndicator();

        // Simulate AI response
        setTimeout(() => {
            hideTypingIndicator();
            addMessage('assistant', `Entendido! Vou processar sua solicitação: "${message}"`);
        }, 1500);
    };

    function addMessage(type, content, action) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ${type}`;
        
        let html = `<div class="ai-message-bubble">${content}</div>`;
        if (action) {
            html += `<span class="ai-message-action">${action}</span>`;
        }
        
        messageEl.innerHTML = html;
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;

        state.messages.push({ type, content, action });
    }

    function showTypingIndicator() {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const indicator = document.createElement('div');
        indicator.className = 'ai-message assistant';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="ai-typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    // =============================================================================
    // APP LAUNCHER
    // =============================================================================

    function initAppLauncher() {
        document.querySelectorAll('.app-icon').forEach(icon => {
            icon.addEventListener('click', function() {
                const app = this.dataset.app;
                switchApp(app);
            });
        });
    }

    function switchApp(appName) {
        document.querySelectorAll('.app-icon').forEach(icon => {
            icon.classList.toggle('active', icon.dataset.app === appName);
        });
        state.currentApp = appName;
        
        // Dispatch custom event for app switching
        document.dispatchEvent(new CustomEvent('app-switch', { detail: { app: appName } }));
    }

    // =============================================================================
    // NAVIGATION TABS
    // =============================================================================

    function initTabs() {
        document.querySelectorAll('.topbar-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.topbar-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // =============================================================================
    // QUICK ACTIONS
    // =============================================================================

    function initQuickActions() {
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.textContent;
                addMessage('user', action);
                showTypingIndicator();
                
                setTimeout(() => {
                    hideTypingIndicator();
                    addMessage('assistant', `Ação "${action}" executada com sucesso!`, 'Ver alterações');
                }, 1000);
            });
        });
    }

    // =============================================================================
    // KEYBOARD SHORTCUTS
    // =============================================================================

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Enter to send message in AI input
            if (e.key === 'Enter' && document.activeElement.id === 'ai-input') {
                e.preventDefault();
                sendAIMessage();
            }
            
            // Escape to close AI panel on mobile
            if (e.key === 'Escape' && window.innerWidth <= 1024) {
                const panel = document.getElementById('ai-panel');
                if (panel && panel.classList.contains('open')) {
                    toggleAIPanel();
                }
            }
        });
    }

    // =============================================================================
    // INITIAL MESSAGES
    // =============================================================================

    function loadInitialMessages() {
        addMessage('assistant', 'Olá! Sou o AI Developer. Como posso ajudar você hoje?');
        addMessage('assistant', 'Você pode me pedir para modificar campos, alterar cores, adicionar validações ou qualquer outra mudança no sistema.');
    }

    // =============================================================================
    // INITIALIZE
    // =============================================================================

    function init() {
        initAppLauncher();
        initTabs();
        initQuickActions();
        initKeyboardShortcuts();
        loadInitialMessages();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
