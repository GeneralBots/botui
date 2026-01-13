/* =============================================================================
   ADMIN MODULE - Missing Function Handlers
   These functions are called by onclick handlers in admin HTML files
   ============================================================================= */

(function() {
    'use strict';

    // =============================================================================
    // MODAL HELPERS
    // =============================================================================

    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.showModal) {
                modal.showModal();
            } else {
                modal.classList.add('open');
                modal.style.display = 'flex';
            }
        }
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.close) {
                modal.close();
            } else {
                modal.classList.remove('open');
                modal.style.display = 'none';
            }
        }
    }

    function showNotification(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (typeof window.GBAlerts !== 'undefined') {
            if (type === 'success') window.GBAlerts.success('Admin', message);
            else if (type === 'error') window.GBAlerts.error('Admin', message);
            else if (type === 'warning') window.GBAlerts.warning('Admin', message);
            else window.GBAlerts.info('Admin', message);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // =============================================================================
    // ACCOUNTS.HTML FUNCTIONS
    // =============================================================================

    function showSmtpModal() {
        showModal('smtp-modal');
    }

    function closeSmtpModal() {
        hideModal('smtp-modal');
    }

    function testSmtpConnection() {
        const host = document.getElementById('smtp-host')?.value;
        const port = document.getElementById('smtp-port')?.value;
        const username = document.getElementById('smtp-username')?.value;

        if (!host || !port) {
            showNotification('Please fill in SMTP host and port', 'error');
            return;
        }

        showNotification('Testing SMTP connection...', 'info');

        fetch('/api/settings/smtp/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port: parseInt(port), username })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('SMTP connection successful!', 'success');
            } else {
                showNotification('SMTP connection failed: ' + (data.error || 'Unknown error'), 'error');
            }
        })
        .catch(err => {
            showNotification('Connection test failed: ' + err.message, 'error');
        });
    }

    function connectAccount(provider) {
        showNotification(`Connecting to ${provider}...`, 'info');
        // OAuth flow would redirect to provider
        window.location.href = `/api/auth/oauth/${provider}?redirect=/admin/accounts`;
    }

    function disconnectAccount(provider) {
        if (!confirm(`Disconnect ${provider} account?`)) return;

        fetch(`/api/settings/accounts/${provider}/disconnect`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification(`${provider} disconnected`, 'success');
                    location.reload();
                } else {
                    showNotification('Failed to disconnect: ' + data.error, 'error');
                }
            })
            .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    // =============================================================================
    // ADMIN-DASHBOARD.HTML FUNCTIONS
    // =============================================================================

    function showInviteMemberModal() {
        showModal('invite-member-modal');
    }

    function closeInviteMemberModal() {
        hideModal('invite-member-modal');
    }

    function showBulkInviteModal() {
        showModal('bulk-invite-modal');
    }

    function closeBulkInviteModal() {
        hideModal('bulk-invite-modal');
    }

    function sendInvitation() {
        const email = document.getElementById('invite-email')?.value;
        const role = document.getElementById('invite-role')?.value || 'member';

        if (!email) {
            showNotification('Please enter an email address', 'error');
            return;
        }

        fetch('/api/admin/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Invitation sent to ' + email, 'success');
                closeInviteMemberModal();
            } else {
                showNotification('Failed to send invitation: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function sendBulkInvitations() {
        const emailsText = document.getElementById('bulk-emails')?.value || '';
        const role = document.getElementById('bulk-role')?.value || 'member';
        const emails = emailsText.split(/[\n,;]+/).map(e => e.trim()).filter(e => e);

        if (emails.length === 0) {
            showNotification('Please enter at least one email address', 'error');
            return;
        }

        fetch('/api/admin/invitations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails, role })
        })
        .then(response => response.json())
        .then(data => {
            showNotification(`${data.sent || emails.length} invitations sent`, 'success');
            closeBulkInviteModal();
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function resendInvitation(invitationId) {
        fetch(`/api/admin/invitations/${invitationId}/resend`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Invitation resent', 'success');
                } else {
                    showNotification('Failed to resend: ' + data.error, 'error');
                }
            })
            .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function cancelInvitation(invitationId) {
        if (!confirm('Cancel this invitation?')) return;

        fetch(`/api/admin/invitations/${invitationId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Invitation cancelled', 'success');
                    location.reload();
                }
            })
            .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    // =============================================================================
    // BILLING-DASHBOARD.HTML FUNCTIONS
    // =============================================================================

    function updateBillingPeriod(period) {
        const params = new URLSearchParams({ period });

        // Update dashboard stats via HTMX or fetch
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/admin/billing/stats?${params}`, '#billing-stats');
        } else {
            fetch(`/api/admin/billing/stats?${params}`)
                .then(r => r.json())
                .then(data => updateBillingStats(data))
                .catch(err => console.error('Failed to update billing period:', err));
        }
    }

    function updateBillingStats(data) {
        if (data.totalRevenue) {
            const el = document.getElementById('total-revenue');
            if (el) el.textContent = formatCurrency(data.totalRevenue);
        }
        if (data.activeSubscriptions) {
            const el = document.getElementById('active-subscriptions');
            if (el) el.textContent = data.activeSubscriptions;
        }
    }

    function exportBillingReport() {
        const period = document.getElementById('billingPeriod')?.value || 'current';
        showNotification('Generating billing report...', 'info');

        fetch(`/api/admin/billing/export?period=${period}`)
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Export failed');
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `billing-report-${period}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('Report downloaded', 'success');
            })
            .catch(err => showNotification('Export failed: ' + err.message, 'error'));
    }

    function toggleBreakdownView() {
        const chart = document.getElementById('breakdown-chart');
        const table = document.getElementById('breakdown-table');

        if (chart && table) {
            const showingChart = !chart.classList.contains('hidden');
            chart.classList.toggle('hidden', showingChart);
            table.classList.toggle('hidden', !showingChart);
        }
    }

    function showQuotaSettings() {
        showModal('quota-settings-modal');
    }

    function closeQuotaSettings() {
        hideModal('quota-settings-modal');
    }

    function saveQuotaSettings() {
        const form = document.getElementById('quota-form');
        if (!form) return;

        const formData = new FormData(form);
        const quotas = Object.fromEntries(formData);

        fetch('/api/admin/billing/quotas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quotas)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Quota settings saved', 'success');
                closeQuotaSettings();
            } else {
                showNotification('Failed to save: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function configureAlerts() {
        showModal('alerts-config-modal');
    }

    function closeAlertsConfig() {
        hideModal('alerts-config-modal');
    }

    function saveAlertSettings() {
        const form = document.getElementById('alerts-form');
        if (!form) return;

        const formData = new FormData(form);
        const settings = Object.fromEntries(formData);

        fetch('/api/admin/billing/alerts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Alert settings saved', 'success');
                closeAlertsConfig();
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    // =============================================================================
    // BILLING.HTML FUNCTIONS
    // =============================================================================

    function showUpgradeModal() {
        showModal('upgrade-modal');
    }

    function closeUpgradeModal() {
        hideModal('upgrade-modal');
    }

    function showCancelModal() {
        showModal('cancel-modal');
    }

    function closeCancelModal() {
        hideModal('cancel-modal');
    }

    function showAddPaymentModal() {
        showModal('add-payment-modal');
    }

    function closeAddPaymentModal() {
        hideModal('add-payment-modal');
    }

    function showEditAddressModal() {
        showModal('edit-address-modal');
    }

    function closeEditAddressModal() {
        hideModal('edit-address-modal');
    }

    function exportInvoices() {
        showNotification('Exporting invoices...', 'info');

        fetch('/api/billing/invoices/export')
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Export failed');
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'invoices.csv';
                a.click();
                URL.revokeObjectURL(url);
                showNotification('Invoices exported', 'success');
            })
            .catch(err => showNotification('Export failed: ' + err.message, 'error'));
    }

    function contactSales() {
        window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
    }

    function showDowngradeOptions() {
        closeCancelModal();
        showUpgradeModal();
        // Focus on lower-tier plans
        const planSelector = document.querySelector('.plan-options');
        if (planSelector) {
            planSelector.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function selectPlan(planId) {
        document.querySelectorAll('.plan-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.plan === planId);
        });
    }

    function confirmUpgrade() {
        const selectedPlan = document.querySelector('.plan-option.selected');
        if (!selectedPlan) {
            showNotification('Please select a plan', 'error');
            return;
        }

        const planId = selectedPlan.dataset.plan;

        fetch('/api/billing/subscription/upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: planId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Plan upgraded successfully!', 'success');
                closeUpgradeModal();
                location.reload();
            } else {
                showNotification('Upgrade failed: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function confirmCancellation() {
        const reason = document.getElementById('cancel-reason')?.value;

        fetch('/api/billing/subscription/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Subscription cancelled', 'success');
                closeCancelModal();
                location.reload();
            } else {
                showNotification('Cancellation failed: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    // =============================================================================
    // COMPLIANCE-DASHBOARD.HTML FUNCTIONS
    // =============================================================================

    function updateFramework(framework) {
        // Update dashboard for selected compliance framework
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/compliance/dashboard?framework=${framework}`, '#compliance-content');
        } else {
            fetch(`/api/compliance/dashboard?framework=${framework}`)
                .then(r => r.json())
                .then(data => updateComplianceDashboard(data))
                .catch(err => console.error('Failed to update framework:', err));
        }
    }

    function updateComplianceDashboard(data) {
        // Update various dashboard elements
        if (data.score) {
            const el = document.getElementById('compliance-score');
            if (el) el.textContent = data.score + '%';
        }
    }

    function generateComplianceReport() {
        const framework = document.getElementById('complianceFramework')?.value || 'soc2';
        showNotification('Generating compliance report...', 'info');

        fetch(`/api/compliance/report?framework=${framework}`)
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Report generation failed');
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compliance-report-${framework}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('Report generated', 'success');
            })
            .catch(err => showNotification('Report failed: ' + err.message, 'error'));
    }

    function startAuditPrep() {
        showModal('audit-prep-modal');
    }

    function closeAuditPrep() {
        hideModal('audit-prep-modal');
    }

    function showEvidenceUpload() {
        showModal('evidence-upload-modal');
    }

    function closeEvidenceUpload() {
        hideModal('evidence-upload-modal');
    }

    function uploadEvidence() {
        const fileInput = document.getElementById('evidence-file');
        const category = document.getElementById('evidence-category')?.value;

        if (!fileInput?.files?.length) {
            showNotification('Please select a file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('category', category);

        fetch('/api/compliance/evidence', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Evidence uploaded', 'success');
                closeEvidenceUpload();
            } else {
                showNotification('Upload failed: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function filterLogs() {
        const category = document.getElementById('logCategory')?.value || 'all';

        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', `/api/compliance/audit-log?category=${category}`, '#audit-log-list');
        }
    }

    function exportAuditLog() {
        const category = document.getElementById('logCategory')?.value || 'all';
        showNotification('Exporting audit log...', 'info');

        fetch(`/api/compliance/audit-log/export?category=${category}`)
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Export failed');
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'audit-log.csv';
                a.click();
                URL.revokeObjectURL(url);
                showNotification('Audit log exported', 'success');
            })
            .catch(err => showNotification('Export failed: ' + err.message, 'error'));
    }

    // =============================================================================
    // GROUPS.HTML FUNCTIONS
    // =============================================================================

    function closeDetailPanel() {
        const panel = document.getElementById('detail-panel');
        if (panel) {
            panel.classList.remove('open');
        }
    }

    function openDetailPanel(groupId) {
        const panel = document.getElementById('detail-panel');
        if (panel) {
            panel.classList.add('open');
            // Load group details
            if (typeof htmx !== 'undefined') {
                htmx.ajax('GET', `/api/admin/groups/${groupId}`, '#panel-content');
            }
        }
    }

    function createGroup() {
        showModal('create-group-modal');
    }

    function closeCreateGroup() {
        hideModal('create-group-modal');
    }

    function saveGroup() {
        const name = document.getElementById('group-name')?.value;
        const description = document.getElementById('group-description')?.value;

        if (!name) {
            showNotification('Please enter a group name', 'error');
            return;
        }

        fetch('/api/admin/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Group created', 'success');
                closeCreateGroup();
                location.reload();
            } else {
                showNotification('Failed to create group: ' + data.error, 'error');
            }
        })
        .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    function deleteGroup(groupId) {
        if (!confirm('Delete this group? This action cannot be undone.')) return;

        fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Group deleted', 'success');
                    closeDetailPanel();
                    location.reload();
                }
            })
            .catch(err => showNotification('Error: ' + err.message, 'error'));
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

    function formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // =============================================================================
    // EXPORT TO WINDOW
    // =============================================================================

    // Accounts
    window.showSmtpModal = showSmtpModal;
    window.closeSmtpModal = closeSmtpModal;
    window.testSmtpConnection = testSmtpConnection;
    window.connectAccount = connectAccount;
    window.disconnectAccount = disconnectAccount;

    // Admin Dashboard
    window.showInviteMemberModal = showInviteMemberModal;
    window.closeInviteMemberModal = closeInviteMemberModal;
    window.showBulkInviteModal = showBulkInviteModal;
    window.closeBulkInviteModal = closeBulkInviteModal;
    window.sendInvitation = sendInvitation;
    window.sendBulkInvitations = sendBulkInvitations;
    window.resendInvitation = resendInvitation;
    window.cancelInvitation = cancelInvitation;

    // Billing Dashboard
    window.updateBillingPeriod = updateBillingPeriod;
    window.exportBillingReport = exportBillingReport;
    window.toggleBreakdownView = toggleBreakdownView;
    window.showQuotaSettings = showQuotaSettings;
    window.closeQuotaSettings = closeQuotaSettings;
    window.saveQuotaSettings = saveQuotaSettings;
    window.configureAlerts = configureAlerts;
    window.closeAlertsConfig = closeAlertsConfig;
    window.saveAlertSettings = saveAlertSettings;

    // Billing
    window.showUpgradeModal = showUpgradeModal;
    window.closeUpgradeModal = closeUpgradeModal;
    window.showCancelModal = showCancelModal;
    window.closeCancelModal = closeCancelModal;
    window.showAddPaymentModal = showAddPaymentModal;
    window.closeAddPaymentModal = closeAddPaymentModal;
    window.showEditAddressModal = showEditAddressModal;
    window.closeEditAddressModal = closeEditAddressModal;
    window.exportInvoices = exportInvoices;
    window.contactSales = contactSales;
    window.showDowngradeOptions = showDowngradeOptions;
    window.selectPlan = selectPlan;
    window.confirmUpgrade = confirmUpgrade;
    window.confirmCancellation = confirmCancellation;

    // Compliance Dashboard
    window.updateFramework = updateFramework;
    window.generateComplianceReport = generateComplianceReport;
    window.startAuditPrep = startAuditPrep;
    window.closeAuditPrep = closeAuditPrep;
    window.showEvidenceUpload = showEvidenceUpload;
    window.closeEvidenceUpload = closeEvidenceUpload;
    window.uploadEvidence = uploadEvidence;
    window.filterLogs = filterLogs;
    window.exportAuditLog = exportAuditLog;

    // Groups
    window.closeDetailPanel = closeDetailPanel;
    window.openDetailPanel = openDetailPanel;
    window.createGroup = createGroup;
    window.closeCreateGroup = closeCreateGroup;
    window.saveGroup = saveGroup;
    window.deleteGroup = deleteGroup;

})();
