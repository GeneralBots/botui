const botCoderTerminal = {
    term: null,
    ws: null,

    init: function() {
        if (!window.Terminal) {
            console.error('xterm.js not loaded. Cannot init terminal.');
            document.getElementById('xtermContainer').innerHTML = '<div class="botcoder-error">Terminal library not found. Run "npm install xterm" to install it.</div>';
            return;
        }

        this.term = new Terminal({
            theme: {
                background: '#0f172a',
                foreground: '#f8fafc',
                cursor: '#3b82f6'
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 13,
            cursorBlink: true
        });

        this.term.open(document.getElementById('xtermContainer'));
        this.term.write('Welcome to BotCoder Interactive Shell\r\n');
        this.term.write('$ ');

        // Basic echo for demo
        this.term.onData(e => {
            if (e === '\r') {
                this.term.write('\r\n$ ');
            } else if (e === '\u007f') { // Backspace
                this.term.write('\b \b');
            } else {
                this.term.write(e);
            }
        });

        // Initialize WebSocket (mock endpoint)
        this.connect();
    },

    connect: function() {
        // ws = new WebSocket('ws://localhost:8080/ws/terminal/session-123');
        // ws.onmessage = (msg) => this.term.write(msg.data);
    },

    newTerminal: function() {
        alert("New terminal tab created!");
    },

    closeTerminal: function() {
        alert("Terminal tab closed!");
    },

    clearTerminal: function() {
        if (this.term) {
            this.term.clear();
            this.term.write('$ ');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => botCoderTerminal.init());
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    botCoderTerminal.init();
}
