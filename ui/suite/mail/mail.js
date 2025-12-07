/**
 * Mail Module JavaScript
 * Email client functionality including compose, selection, and modals
 */

// Compose Modal Functions
function openCompose(replyTo = null, forward = null) {
    const modal = document.getElementById('composeModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.remove('minimized');
        if (replyTo) {
            document.getElementById('composeTo').value = replyTo;
        }
    }
}

function closeCompose() {
    const modal = document.getElementById('composeModal');
    if (modal) {
        modal.classList.add('hidden');
        // Clear form
        document.getElementById('composeTo').value = '';
        document.getElementById('composeCc').value = '';
        document.getElementById('composeBcc').value = '';
        document.getElementById('composeSubject').value = '';
        document.getElementById('composeBody').value = '';
    }
}

function minimizeCompose() {
    const modal = document.getElementById('composeModal');
    if (modal) {
        modal.classList.toggle('minimized');
    }
}

function toggleCcBcc() {
    const ccBcc = document.getElementById('ccBccFields');
    if (ccBcc) {
        ccBcc.classList.toggle('hidden');
    }
}

// Schedule Functions
function toggleScheduleMenu() {
    const menu = document.getElementById('scheduleMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function scheduleSend(when) {
    console.log('Scheduling send for:', when);
    toggleScheduleMenu();
}

// Selection Functions
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.email-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkActions();
}

function updateBulkActions() {
    const checked = document.querySelectorAll('.email-checkbox:checked');
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
        bulkActions.style.display = checked.length > 0 ? 'flex' : 'none';
    }
}

// Modal Functions
function openTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) modal.classList.remove('hidden');
}

function closeTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) modal.classList.add('hidden');
}

function openSignaturesModal() {
    const modal = document.getElementById('signaturesModal');
    if (modal) modal.classList.remove('hidden');
}

function closeSignaturesModal() {
    const modal = document.getElementById('signaturesModal');
    if (modal) modal.classList.add('hidden');
}

function openRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) modal.classList.remove('hidden');
}

function closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    if (modal) modal.classList.add('hidden');
}

function useTemplate(name) {
    console.log('Using template:', name);
    closeTemplatesModal();
}

function useSignature(name) {
    console.log('Using signature:', name);
    closeSignaturesModal();
}

// Bulk Actions
function archiveSelected() {
    const checked = document.querySelectorAll('.email-checkbox:checked');
    console.log('Archiving', checked.length, 'emails');
}

function deleteSelected() {
    const checked = document.querySelectorAll('.email-checkbox:checked');
    if (confirm(`Delete ${checked.length} email(s)?`)) {
        console.log('Deleting', checked.length, 'emails');
    }
}

function markSelectedRead() {
    const checked = document.querySelectorAll('.email-checkbox:checked');
    console.log('Marking', checked.length, 'emails as read');
}

// File Attachment
function handleAttachment(input) {
    const files = input.files;
    const attachmentList = document.getElementById('attachmentList');
    if (attachmentList && files.length > 0) {
        for (const file of files) {
            const item = document.createElement('div');
            item.className = 'attachment-item';
            item.innerHTML = `
                <span>${file.name}</span>
                <button type="button" onclick="this.parentElement.remove()">×</button>
            `;
            attachmentList.appendChild(item);
        }
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Escape closes modals
    if (e.key === 'Escape') {
        closeCompose();
        closeTemplatesModal();
        closeSignaturesModal();
        closeRulesModal();
    }
    
    // Ctrl+N for new email
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openCompose();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Add change listeners to checkboxes
    document.querySelectorAll('.email-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkActions);
    });
});
