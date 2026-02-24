if (typeof window.WindowManager === 'undefined') {
    class WindowManager {
        constructor() {
            this.openWindows = [];
            this.activeWindowId = null;
            this.zIndexCounter = 100;
            this.workspace = document.getElementById('desktop-content') || document.body;
            this.taskbarApps = document.getElementById('taskbar-apps');
        }

        open(id, title, htmlContent) {
            // If window already exists, focus it
            const existingWindow = this.openWindows.find(w => w.id === id);
            if (existingWindow) {
                this.focus(id);
                return;
            }

            // Create new window
            const windowData = {
                id,
                title,
                isMinimized: false,
                isMaximized: false,
                previousState: null
            };
            this.openWindows.push(windowData);

            // Generate DOM structure
            const windowEl = document.createElement('div');
            windowEl.id = `window-${id}`;
            // Add random slight offset for cascade effect
            const offset = (this.openWindows.length * 20) % 100;
            const top = 100 + offset;
            const left = 150 + offset;

            windowEl.className = 'absolute w-[700px] h-[500px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200 overflow-hidden window-element';
            windowEl.style.top = `${top}px`;
            windowEl.style.left = `${left}px`;
            windowEl.style.zIndex = this.zIndexCounter++;

            windowEl.innerHTML = `
                <!-- Header (Draggable) -->
                <div class="window-header h-10 bg-white/95 backdrop-blur flex items-center justify-between px-4 border-b border-gray-200 select-none cursor-move">
                    <div class="font-mono text-xs font-bold text-brand-600 tracking-wide">${title}</div>
                    <div class="flex space-x-3 text-gray-400">
                        <button class="btn-minimize hover:text-gray-600" onclick="window.WindowManager.toggleMinimize('${id}')"><i class="fa-solid fa-minus"></i></button>
                        <button class="btn-maximize hover:text-gray-600" onclick="window.WindowManager.toggleMaximize('${id}')"><i class="fa-regular fa-square"></i></button>
                        <button class="btn-close hover:text-red-500" onclick="window.WindowManager.close('${id}')"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <!-- Body (HTMX target) -->
                <div id="window-body-${id}" class="window-body relative flex-1 overflow-y-auto bg-[#fafdfa]"></div>
            `;

            this.workspace.appendChild(windowEl);

            // Inject content into the window body
            const windowBody = windowEl.querySelector(`#window-body-${id}`);
            if (windowBody) {
                this.injectContentWithScripts(windowBody, htmlContent);
            }

            // Add to taskbar
            if (this.taskbarApps) {
                const taskbarIcon = document.createElement('div');
                taskbarIcon.id = `taskbar-item-${id}`;
                taskbarIcon.className = 'h-10 w-12 flex items-center justify-center cursor-pointer bg-brand-50 rounded border-b-2 border-brand-500 transition-all taskbar-icon';
                taskbarIcon.onclick = () => this.toggleMinimize(id);
                
                let iconHtml = '<i class="fa-solid fa-window-maximize"></i>';
                if (id === 'vibe') iconHtml = '<i class="fa-solid fa-microchip"></i>';
                else if (id === 'tasks') iconHtml = '<i class="fa-solid fa-clipboard-list"></i>';
                else if (id === 'chat') iconHtml = '<i class="fa-solid fa-comment-dots"></i>';
                else if (id === 'terminal') iconHtml = '<i class="fa-solid fa-terminal"></i>';
                else if (id === 'drive') iconHtml = '<i class="fa-regular fa-folder-open"></i>';
                else if (id === 'editor') iconHtml = '<i class="fa-solid fa-code"></i>';
                else if (id === 'browser') iconHtml = '<i class="fa-regular fa-compass"></i>';
                else if (id === 'mail') iconHtml = '<i class="fa-regular fa-envelope"></i>';
                else if (id === 'settings') iconHtml = '<i class="fa-solid fa-gear"></i>';
                
                taskbarIcon.innerHTML = `
                    <div class="app-icon w-8 h-8 rounded-md flex items-center justify-center text-white text-xs shadow-sm">
                        ${iconHtml}
                    </div>
                `;
                this.taskbarApps.appendChild(taskbarIcon);
            }

            this.makeDraggable(windowEl);
            this.makeResizable(windowEl);
            this.focus(id);

            // Tell HTMX to process the new content
            if (window.htmx) {
                htmx.process(windowEl);
            }
        }

        focus(id) {
            this.activeWindowId = id;
            const windowEl = document.getElementById(`window-${id}`);
            if (windowEl) {
                windowEl.style.zIndex = this.zIndexCounter++;
            }

            // Highlight taskbar icon
            if (this.taskbarApps) {
                const icons = this.taskbarApps.querySelectorAll('.taskbar-icon');
                icons.forEach(icon => {
                    icon.classList.remove('border-brand-500');
                    icon.classList.add('border-transparent');
                });
                const activeIcon = document.getElementById(`taskbar-item-${id}`);
                if (activeIcon) {
                    activeIcon.classList.remove('border-transparent');
                    activeIcon.classList.add('border-brand-500');
                }
            }
        }

        close(id) {
            const windowEl = document.getElementById(`window-${id}`);
            if (windowEl) {
                windowEl.remove();
            }
            const taskbarIcon = document.getElementById(`taskbar-item-${id}`);
            if (taskbarIcon) {
                taskbarIcon.remove();
            }
            this.openWindows = this.openWindows.filter(w => w.id !== id);
            if (this.activeWindowId === id) {
                this.activeWindowId = null;
                // Optionally focus the next highest z-index window
            }
        }

        toggleMinimize(id) {
            const windowObj = this.openWindows.find(w => w.id === id);
            if (!windowObj) return;

            const windowEl = document.getElementById(`window-${id}`);
            if (!windowEl) return;

            if (windowObj.isMinimized) {
                // Restore
                windowEl.style.display = 'flex';
                windowObj.isMinimized = false;
                this.focus(id);
            } else {
                // Minimize
                windowEl.style.display = 'none';
                windowObj.isMinimized = true;
                if (this.activeWindowId === id) {
                    this.activeWindowId = null;
                }
            }
        }

        toggleMaximize(id) {
            const windowObj = this.openWindows.find(w => w.id === id);
            if (!windowObj) return;

            const windowEl = document.getElementById(`window-${id}`);
            if (!windowEl) return;

            if (windowObj.isMaximized) {
                // Restore
                windowEl.style.width = windowObj.previousState.width;
                windowEl.style.height = windowObj.previousState.height;
                windowEl.style.top = windowObj.previousState.top;
                windowEl.style.left = windowObj.previousState.left;
                windowObj.isMaximized = false;
            } else {
                // Maximize
                windowObj.previousState = {
                    width: windowEl.style.width,
                    height: windowEl.style.height,
                    top: windowEl.style.top,
                    left: windowEl.style.left
                };
                
                // Adjust for taskbar height (assuming taskbar is at bottom)
                const taskbarHeight = document.getElementById('taskbar') ? document.getElementById('taskbar').offsetHeight : 0;
                
                windowEl.style.width = '100%';
                windowEl.style.height = `calc(100% - ${taskbarHeight}px)`;
                windowEl.style.top = '0px';
                windowEl.style.left = '0px';
                windowObj.isMaximized = true;
            }
            this.focus(id);
        }

        makeDraggable(windowEl) {
            const header = windowEl.querySelector('.window-header');
            if (!header) return;

            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            const onMouseDown = (e) => {
                // Don't drag if clicking buttons
                if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialLeft = parseInt(windowEl.style.left || 0, 10);
                initialTop = parseInt(windowEl.style.top || 0, 10);
                
                this.focus(windowEl.id.replace('window-', ''));
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (e) => {
                if (!isDragging) return;
                
                // Allow animation frame optimization here in a real implementation
                requestAnimationFrame(() => {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    
                    // Add basic boundaries
                    let newLeft = initialLeft + dx;
                    let newTop = initialTop + dy;
                    
                    // Prevent dragging completely out
                    newTop = Math.max(0, newTop); 
                    
                    windowEl.style.left = `${newLeft}px`;
                    windowEl.style.top = `${newTop}px`;
                });
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            header.addEventListener('mousedown', onMouseDown);
            
            // Add focus listener to the whole window
            windowEl.addEventListener('mousedown', () => {
                 this.focus(windowEl.id.replace('window-', ''));
            });
        }

        injectContentWithScripts(container, htmlContent) {
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            // Extract all script tags
            const scripts = tempDiv.querySelectorAll('script');
            const scriptsToExecute = [];

            scripts.forEach((originalScript) => {
                const scriptClone = document.createElement('script');
                Array.from(originalScript.attributes).forEach(attr => {
                    scriptClone.setAttribute(attr.name, attr.value);
                });
                scriptClone.textContent = originalScript.textContent;
                scriptsToExecute.push(scriptClone);
                originalScript.remove(); // Remove from tempDiv so innerHTML doesn't include it
            });

            // Inject HTML content without scripts
            container.innerHTML = tempDiv.innerHTML;

            // Execute each script
            scriptsToExecute.forEach((script) => {
                container.appendChild(script);
            });
        }

        makeResizable(windowEl) {
            // Implement simple bottom-right resize for now
            // In a full implementation, you'd add invisible border handles
            windowEl.style.resize = 'both';
            // Note: CSS resize creates conflicts with custom dragging/resizing if not careful.
            // For a true "WinBox" feel, custom handles (divs) on all 8 edges/corners are needed.
        }
    }

    // Initialize globally
    window.WindowManager = new WindowManager();
}