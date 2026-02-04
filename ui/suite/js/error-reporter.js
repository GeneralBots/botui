(function() {
    'use strict';

    const MAX_ERRORS = 50;
    const REPORT_ENDPOINT = '/api/client-errors';
    let errorQueue = [];
    let isReporting = false;

    function formatError(error, context = {}) {
        return {
            type: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            context: context
        };
    }

    async function reportErrors() {
        if (isReporting || errorQueue.length === 0) return;

        isReporting = true;
        const errorsToReport = errorQueue.splice(0, MAX_ERRORS);
        errorQueue = [];

        try {
            const response = await fetch(REPORT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ errors: errorsToReport })
            });

            if (!response.ok) {
                console.warn('[ErrorReporter] Failed to send errors:', response.status);
            }
        } catch (e) {
            console.warn('[ErrorReporter] Failed to send errors:', e.message);
            errorQueue.unshift(...errorsToReport);
        } finally {
            isReporting = false;
            
            if (errorQueue.length > 0) {
                setTimeout(reportErrors, 1000);
            }
        }
    }

    function queueError(errorData) {
        errorQueue.push(errorData);
        if (errorQueue.length >= 10) {
            reportErrors();
        }
    }

    window.addEventListener('error', (event) => {
        const errorData = formatError(event.error || new Error(event.message), {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
        queueError(errorData);
    });

    window.addEventListener('unhandledrejection', (event) => {
        const errorData = formatError(event.reason || new Error(String(event.reason)), {
            type: 'unhandledRejection'
        });
        queueError(errorData);
    });

    window.ErrorReporter = {
        report: function(error, context) {
            queueError(formatError(error, context));
        },
        flush: function() {
            reportErrors();
        }
    };

    if (document.readyState === 'complete') {
        setTimeout(reportErrors, 1000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(reportErrors, 1000);
        });
    }

    console.log('[ErrorReporter] Client-side error reporting initialized');

    window.NavigationLogger = {
        log: function(from, to, method) {
            const navEvent = {
                type: 'navigation',
                from: from,
                to: to,
                method: method,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            queueError({
                name: 'Navigation',
                message: `${method}: ${from} -> ${to}`,
                stack: undefined
            });
        }
    };

    document.body.addEventListener('click', function(e) {
        const target = e.target.closest('[data-section]');
        if (target) {
            const section = target.getAttribute('data-section');
            const currentHash = window.location.hash.slice(1) || '';
            if (section !== currentHash) {
                setTimeout(() => {
                    window.NavigationLogger.log(currentHash || 'home', section, 'click');
                }, 100);
            }
        }
    }, true);

    window.addEventListener('hashchange', function(e) {
        const oldURL = new URL(e.oldURL);
        const newURL = new URL(e.newURL);
        const fromHash = oldURL.hash.slice(1) || '';
        const toHash = newURL.hash.slice(1) || '';
        window.NavigationLogger.log(fromHash || 'home', toHash, 'hashchange');
    });

    console.log('[NavigationLogger] Navigation tracking initialized');
})();
