(function () {
  "use strict";

  const DEFAULT_LOCALE = "en";
  const STORAGE_KEY = "gb-locale";
  const CACHE_TTL_MS = 3600000;

  const FALLBACK_TRANSLATIONS = {
    en: {
      "app-name": "General Bots",
      "app-tagline": "Your AI-powered productivity workspace",
      "nav-home": "Home",
      "nav-chat": "Chat",
      "nav-paper": "Paper",
      "nav-sheet": "Sheet",
      "nav-slides": "Slides",
      "nav-mail": "Mail",
      "nav-calendar": "Calendar",
      "nav-drive": "Drive",
      "nav-tasks": "Tasks",
      "nav-meet": "Meet",
      "nav-research": "Research",
      "nav-analytics": "Analytics",
      "nav-dashboards": "Dashboards",
      "nav-monitoring": "Monitoring",
      "nav-admin": "Admin",
      "nav-sources": "Sources",
      "nav-tools": "Tools",
      "nav-attendant": "Attendant",
      "nav-settings": "Settings",
      "nav-search": "Search...",
      "nav-all-apps": "All Applications",
      "dashboard-title": "Dashboard",
      "dashboard-welcome": "Welcome back!",
      "dashboard-quick-actions": "Quick Actions",
      "dashboard-recent-activity": "Recent Activity",
      "dashboard-no-activity": "No recent activity yet. Start exploring!",
      "quick-start-chat": "Start Chat",
      "quick-upload-files": "Upload Files",
      "quick-new-task": "New Task",
      "quick-compose-email": "Compose Email",
      "quick-start-meeting": "Start Meeting",
      "quick-new-event": "New Event",
      "action-save": "Save",
      "action-cancel": "Cancel",
      "action-delete": "Delete",
      "action-edit": "Edit",
      "action-close": "Close",
      "action-confirm": "Confirm",
      "action-retry": "Retry",
      "action-back": "Back",
      "action-next": "Next",
      "action-submit": "Submit",
      "action-send": "Send",
      "action-search": "Search",
      "action-refresh": "Refresh",
      "action-copy": "Copy",
      "action-paste": "Paste",
      "action-create": "Create",
      "action-update": "Update",
      "action-upload": "Upload",
      "action-download": "Download",
      "action-export": "Export",
      "action-import": "Import",
      "action-share": "Share",
      "action-reply": "Reply",
      "action-forward": "Forward",
      "action-archive": "Archive",
      "action-restore": "Restore",
      "action-login": "Log In",
      "action-logout": "Log Out",
      "action-signup": "Sign Up",
      "action-register": "Register",
      "label-loading": "Loading...",
      "label-saving": "Saving...",
      "label-processing": "Processing...",
      "label-searching": "Searching...",
      "label-uploading": "Uploading...",
      "label-downloading": "Downloading...",
      "label-no-results": "No results found",
      "label-no-data": "No data available",
      "label-empty": "Empty",
      "label-none": "None",
      "label-all": "All",
      "label-selected": "Selected",
      "label-required": "Required",
      "label-optional": "Optional",
      "label-name": "Name",
      "label-email": "Email",
      "label-password": "Password",
      "label-username": "Username",
      "label-description": "Description",
      "label-status": "Status",
      "label-date": "Date",
      "label-time": "Time",
      "label-type": "Type",
      "status-success": "Success",
      "status-error": "Error",
      "status-warning": "Warning",
      "status-info": "Information",
      "status-loading": "Loading",
      "status-complete": "Complete",
      "status-pending": "Pending",
      "status-active": "Active",
      "status-inactive": "Inactive",
      "status-connected": "Connected",
      "status-disconnected": "Disconnected",
      "status-online": "Online",
      "status-offline": "Offline",
      "time-now": "Just now",
      "time-today": "Today",
      "time-yesterday": "Yesterday",
      "time-tomorrow": "Tomorrow",
      "chat-title": "Chat",
      "chat-placeholder": "Type a message...",
      "chat-send": "Send",
      "chat-new-conversation": "New Conversation",
      "chat-history": "Chat History",
      "chat-clear": "Clear Chat",
      "chat-voice": "Voice input",
      "chat-online": "Online",
      "chat-offline": "Offline",
      "drive-title": "Drive",
      "drive-upload": "Upload",
      "drive-new-folder": "New Folder",
      "drive-download": "Download",
      "drive-delete": "Delete",
      "drive-rename": "Rename",
      "drive-share": "Share",
      "drive-my-drive": "My Drive",
      "drive-shared": "Shared with me",
      "drive-recent": "Recent",
      "drive-starred": "Starred",
      "drive-trash": "Trash",
      "drive-empty-folder": "This folder is empty",
      "drive-drop-files": "Drop files here to upload",
      "tasks-title": "Tasks",
      "tasks-new": "New Task",
      "tasks-all": "All Tasks",
      "tasks-pending": "Pending",
      "tasks-completed": "Completed",
      "tasks-overdue": "Overdue",
      "tasks-today": "Today",
      "tasks-active": "Active Intents",
      "tasks-awaiting": "Awaiting Decision",
      "tasks-paused": "Paused",
      "tasks-blocked": "Blocked/Issues",
      "tasks-no-tasks": "No tasks found",
      "calendar-title": "Calendar",
      "calendar-today": "Today",
      "calendar-day": "Day",
      "calendar-week": "Week",
      "calendar-month": "Month",
      "calendar-year": "Year",
      "calendar-new-event": "New Event",
      "calendar-my-calendars": "My Calendars",
      "calendar-no-events": "No events scheduled",
      "meet-title": "Meet",
      "meet-join": "Join Meeting",
      "meet-leave": "Leave Meeting",
      "meet-mute": "Mute",
      "meet-unmute": "Unmute",
      "meet-video-on": "Camera On",
      "meet-video-off": "Camera Off",
      "meet-share-screen": "Share Screen",
      "meet-stop-sharing": "Stop Sharing",
      "meet-end-call": "End Call",
      "meet-new-meeting": "New Meeting",
      "meet-active-rooms": "Active Rooms",
      "meet-record": "Record",
      "email-title": "Mail",
      "email-compose": "Compose",
      "email-inbox": "Inbox",
      "email-sent": "Sent",
      "email-drafts": "Drafts",
      "email-trash": "Trash",
      "email-spam": "Spam",
      "email-starred": "Starred",
      "email-to": "To",
      "email-subject": "Subject",
      "email-send": "Send",
      "email-no-messages": "No messages",
      "paper-title": "Paper",
      "paper-new-note": "New Note",
      "paper-search-notes": "Search notes...",
      "paper-quick-start": "Quick Start",
      "paper-template-blank": "Blank",
      "paper-template-meeting": "Meeting",
      "paper-template-todo": "To-Do",
      "paper-template-research": "Research",
      "paper-untitled": "Untitled",
      "paper-placeholder": "Start writing, or type / for commands...",
      "paper-commands": "Commands",
      "paper-heading1": "Heading 1",
      "paper-heading1-desc": "Large section heading",
      "paper-heading2": "Heading 2",
      "paper-heading2-desc": "Medium section heading",
      "paper-heading3": "Heading 3",
      "paper-heading3-desc": "Small section heading",
      "paper-bullet-list": "Bullet List",
      "paper-bullet-list-desc": "Create a bullet list",
      "paper-numbered-list": "Numbered List",
      "paper-numbered-list-desc": "Create a numbered list",
      "paper-todo-list": "To-Do List",
      "paper-todo-list-desc": "Checkable task list",
      "paper-quote": "Quote",
      "paper-quote-desc": "Blockquote for citations",
      "paper-divider": "Divider",
      "paper-divider-desc": "Horizontal separator",
      "paper-code": "Code Block",
      "paper-code-desc": "Code with syntax highlighting",
      "paper-callout": "Callout",
      "paper-callout-desc": "Highlighted information box",
      "paper-table": "Table",
      "paper-table-desc": "Insert a table",
      "paper-image": "Image",
      "paper-image-desc": "Insert an image",
      "paper-link": "Link",
      "paper-link-desc": "Insert a hyperlink",
      "paper-saved": "Saved",
      "paper-saving": "Saving...",
      "paper-word-count": "{count} words",
      "paper-char-count": "{count} characters",
      "paper-last-edited-now": "Last edited: Just now",
      "paper-export": "Export Document",
      "paper-export-pdf": "PDF Document",
      "paper-export-docx": "Word Document",
      "paper-export-md": "Markdown",
      "paper-export-html": "HTML",
      "paper-export-txt": "Plain Text",
      "paper-ai-assistant": "AI Assistant",
      "paper-ai-summarize": "Summarize",
      "paper-ai-expand": "Expand",
      "paper-ai-improve": "Improve",
      "paper-ai-simplify": "Simplify",
      "paper-ai-tone": "Change Tone",
      "paper-ai-translate": "Translate",
      "paper-ai-custom": "Custom Prompt",
      "research-title": "Research",
      "research-search-placeholder": "Ask anything...",
      "research-collections": "Collections",
      "research-new-collection": "New Collection",
      "research-sources": "Sources",
      "settings-title": "Settings",
      "settings-general": "General",
      "settings-account": "Account",
      "settings-notifications": "Notifications",
      "settings-privacy": "Privacy",
      "settings-security": "Security",
      "settings-appearance": "Appearance",
      "settings-theme": "Theme",
      "settings-theme-light": "Light",
      "settings-theme-dark": "Dark",
      "settings-theme-system": "System",
      "settings-language": "Language",
      "settings-timezone": "Timezone",
      "settings-save": "Save Changes",
      "settings-saved": "Settings saved successfully",
      "notifications-title": "Notifications",
      "notifications-clear": "Clear all",
      "notifications-empty": "No notifications",
      "admin-title": "Administration",
      "admin-panel-title": "Admin Panel",
      "admin-dashboard": "Dashboard",
      "admin-dashboard-title": "Dashboard",
      "admin-dashboard-subtitle": "System overview and quick statistics",
      "admin-users": "Users",
      "admin-users-subtitle": "Manage user accounts and permissions",
      "admin-bots": "Bots",
      "admin-bots-subtitle": "Manage bot instances and deployments",
      "admin-system": "System",
      "admin-logs": "Logs",
      "admin-settings": "Settings",
      "admin-groups": "Groups",
      "admin-groups-subtitle": "Manage groups and team permissions",
      "admin-dns": "DNS",
      "admin-dns-subtitle": "Configure custom domains and DNS settings",
      "admin-billing": "Billing",
      "admin-billing-subtitle": "Manage subscription and payment settings",
      "admin-audit": "Audit Log",
      "admin-audit-subtitle": "Track system events and user actions",
      "admin-quick-actions": "Quick Actions",
      "admin-system-health": "System Health",
      "admin-add-user": "Add User",
      "admin-add-group": "Add Group",
      "admin-view-audit": "View Audit Log",
      "admin-total-users": "Total Users",
      "admin-active-groups": "Active Groups",
      "admin-running-bots": "Running Bots",
      "admin-storage-used": "Storage Used",
      "admin-create-user": "Create User",
      "admin-create-group": "Create Group",
      "admin-register-dns": "Register DNS",
      "admin-recent-activity": "Recent Activity",
      "admin-system-health": "System Health",
      "admin-dns-title": "DNS Management",
      "admin-dns-subtitle": "Register and manage DNS hostnames for your bots",
      "admin-dns-register": "Register Hostname",
      "admin-dns-registered": "Registered Hostnames",
      "admin-dns-search": "Search hostnames...",
      "admin-dns-loading": "Loading DNS records...",
      "admin-dns-hostname": "Hostname",
      "admin-dns-record-type": "Record Type",
      "admin-dns-target": "Target/IP Address",
      "admin-dns-ttl": "TTL (seconds)",
      "admin-dns-auto-ssl": "Automatically provision SSL certificate",
      "admin-dns-help-title": "DNS Configuration Help",
      "admin-groups-title": "Group Management",
      "admin-groups-subtitle": "Manage groups, members, and permissions",
      "admin-groups-create": "Create Group",
      "admin-groups-search": "Search groups...",
      "admin-groups-loading": "Loading groups...",
      "admin-group-name": "Group Name",
      "admin-group-description": "Description",
      "admin-group-visibility": "Visibility",
      "admin-group-join-policy": "Join Policy",
      "admin-group-members": "Members",
      "admin-group-permissions": "Permissions",
      "admin-group-settings": "Settings",
      "admin-group-overview": "Overview",
      "admin-users-title": "User Management",
      "admin-users-add": "Add User",
      "admin-users-search": "Search users...",
      "analytics-title": "Analytics",
      "analytics-dashboard-title": "Analytics Dashboard",
      "analytics-last-hour": "Last Hour",
      "analytics-last-6h": "Last 6 Hours",
      "analytics-last-24h": "Last 24 Hours",
      "analytics-last-7d": "Last 7 Days",
      "analytics-last-30d": "Last 30 Days",
      "validation-required": "This field is required",
      "validation-email-invalid": "Please enter a valid email address",
      "compliance-title": "API Compliance Report",
      "compliance-subtitle":
        "Security scan for all bots - Check for passwords, secrets, and security issues",
      "compliance-export": "Export Report",
      "compliance-run-scan": "Run Compliance Scan",
      "compliance-critical": "Critical",
      "compliance-critical-desc": "Requires immediate action",
      "compliance-high": "High",
      "compliance-high-desc": "Security risk",
      "compliance-medium": "Medium",
      "compliance-medium-desc": "Should be addressed",
      "compliance-low": "Low",
      "compliance-low-desc": "Best practice",
      "compliance-info": "Info",
      "compliance-info-desc": "Informational",
      "compliance-filter-severity": "Severity:",
      "compliance-filter-type": "Type:",
      "compliance-issues-found": "{count} issues found",
      "dashboards-title": "Dashboards",
      "dashboards-search-placeholder": "Search dashboards...",
      "dashboards-filter-all": "All Dashboards",
      "dashboards-filter-sales": "Sales",
      "dashboards-filter-marketing": "Marketing",
      "dashboards-filter-operations": "Operations",
      "dashboards-filter-finance": "Finance",
      "dashboards-filter-hr": "HR",
      "dashboards-create": "New Dashboard",
      "dashboards-my-dashboards": "My Dashboards",
      "dashboards-shared": "Shared With Me",
      "dashboards-templates": "Templates",
      "dashboards-data-sources": "Data Sources",
      "dashboards-add-source": "Add Data Source",
      "dashboards-today": "Today",
      "dashboards-last-7d": "Last 7 Days",
      "dashboards-last-30d": "Last 30 Days",
      "dashboards-last-90d": "Last 90 Days",
      "dashboards-last-year": "Last Year",
      "dashboards-custom-range": "Custom Range",
      "dashboards-ask-data": "Ask about your data",
      "dashboards-query-placeholder":
        "e.g., Show me sales by region for last quarter...",
      "dashboards-all-sources": "All Data Sources",
      "dashboards-analyzing": "Analyzing your data...",
      "dashboards-create-title": "Create New Dashboard",
      "dashboards-name": "Name",
      "dashboards-name-placeholder": "My Dashboard",
      "dashboards-description": "Description",
      "dashboards-description-placeholder":
        "Describe what this dashboard shows...",
      "dashboards-layout": "Layout",
      "dashboards-layout-12col": "12 Columns",
      "dashboards-layout-6col": "6 Columns",
      "dashboards-layout-4col": "4 Columns",
      "dashboards-tags": "Tags",
      "dashboards-tags-placeholder": "sales, marketing",
      "dashboards-public": "Make dashboard public",
      "dashboards-start-from": "Start from",
      "dashboards-blank": "Blank",
      "dashboards-sales-template": "Sales",
      "dashboards-marketing-template": "Marketing",
      "dashboards-operations-template": "Operations",
      "dashboards-add-data-source": "Add Data Source",
      "dashboards-source-name": "Name",
      "dashboards-source-name-placeholder": "My Database",
      "dashboards-source-type": "Type",
      "dashboards-select-type": "Select type...",
      "dashboards-databases": "Databases",
      "dashboards-warehouses": "Cloud Data Warehouses",
      "dashboards-apis": "APIs",
      "dashboards-files": "Files",
      "dashboards-internal": "Internal",
      "dashboards-source-description": "Description",
      "dashboards-source-description-placeholder": "Optional description...",
      "dashboards-test-connection": "Test Connection",
      "dashboards-add-widget": "Add Widget",
      "dashboards-charts": "Charts",
      "dashboards-data-display": "Data Display",
      "dashboards-content": "Content",
      "dashboards-filters": "Filters",
      "dashboards-host": "Host",
      "dashboards-port": "Port",
      "dashboards-database": "Database",
      "dashboards-username": "Username",
      "dashboards-password": "Password",
      "dashboards-use-ssl": "Use SSL",
      "dashboards-api-url": "API URL",
      "dashboards-api-key": "API Key",
      "dashboards-file-url": "File URL or Path",
      "dashboards-connection-string": "Connection String",
      "sources-title": "Sources",
      "sources-subtitle": "Manage data sources, prompts, and integrations",
      "sources-search": "Search sources...",
      "sources-prompts": "Prompts",
      "sources-templates": "Templates",
      "sources-news": "News",
      "sources-mcp-servers": "MCP Servers",
      "sources-llm-tools": "LLM Tools",
      "sources-models": "Models",
      "sources-repositories": "Repositories",
      "sources-apps": "Apps",
      "attendant-title": "Attendant Console",
      "attendant-subtitle": "Human support queue management",
      "attendant-queue": "Queue",
      "attendant-active": "Active Chats",
      "attendant-resolved": "Resolved",
      "attendant-assign": "Assign",
      "attendant-transfer": "Transfer Conversation",
      "attendant-resolve": "Resolve",
      "attendant-no-items": "No items in queue",
      "attendant-crm-disabled": "CRM Features Not Enabled",
      "attendant-status-online": "Online - Ready for conversations",
      "attendant-select-conversation": "Select a conversation",
      "modal-confirm-title": "Confirm Action",
      "modal-confirm-message": "Are you sure you want to proceed?",
      "modal-delete-title": "Delete Confirmation",
      "modal-delete-message": "This action cannot be undone. Are you sure?",
      "error-http-400": "Bad request. Please check your input.",
      "error-http-401": "Authentication required. Please log in.",
      "error-http-403": "You don't have permission to access this resource.",
      "error-http-404": "Not found.",
      "error-http-500": "Internal server error. Please try again later.",
      "error-network": "Network error. Please check your connection.",
      "error-unknown": "An unexpected error occurred.",
      "pagination-first": "First",
      "pagination-previous": "Previous",
      "pagination-next": "Next",
      "pagination-last": "Last",
      "a11y-skip-to-content": "Skip to main content",
      "a11y-loading": "Loading, please wait",
      "a11y-menu-open": "Open menu",
      "a11y-menu-close": "Close menu",
    },
    "pt-BR": {
      "app-name": "General Bots",
      "app-tagline": "Seu espaço de trabalho com inteligência artificial",
      "nav-home": "Início",
      "nav-chat": "Chat",
      "nav-paper": "Documentos",
      "nav-sheet": "Planilhas",
      "nav-slides": "Apresentações",
      "nav-mail": "E-mail",
      "nav-calendar": "Calendário",
      "nav-drive": "Arquivos",
      "nav-tasks": "Tarefas",
      "nav-meet": "Reuniões",
      "nav-research": "Pesquisa",
      "nav-analytics": "Analytics",
      "nav-dashboards": "Painéis",
      "nav-monitoring": "Monitoramento",
      "nav-admin": "Administração",
      "nav-sources": "Fontes",
      "nav-tools": "Ferramentas",
      "nav-attendant": "Atendente",
      "nav-settings": "Configurações",
      "nav-search": "Buscar...",
      "nav-all-apps": "Todos os Aplicativos",
      "dashboard-title": "Painel",
      "dashboard-welcome": "Bem-vindo de volta!",
      "dashboard-quick-actions": "Ações Rápidas",
      "dashboard-recent-activity": "Atividade Recente",
      "dashboard-no-activity": "Nenhuma atividade recente. Comece a explorar!",
      "quick-start-chat": "Iniciar Chat",
      "quick-upload-files": "Enviar Arquivos",
      "quick-new-task": "Nova Tarefa",
      "quick-compose-email": "Escrever E-mail",
      "quick-start-meeting": "Iniciar Reunião",
      "quick-new-event": "Novo Evento",
      "action-save": "Salvar",
      "action-cancel": "Cancelar",
      "action-delete": "Excluir",
      "action-edit": "Editar",
      "action-close": "Fechar",
      "action-confirm": "Confirmar",
      "action-retry": "Tentar novamente",
      "action-back": "Voltar",
      "action-next": "Próximo",
      "action-submit": "Enviar",
      "action-send": "Enviar",
      "action-search": "Buscar",
      "action-refresh": "Atualizar",
      "action-copy": "Copiar",
      "action-paste": "Colar",
      "action-create": "Criar",
      "action-update": "Atualizar",
      "action-upload": "Enviar",
      "action-download": "Baixar",
      "action-export": "Exportar",
      "action-import": "Importar",
      "action-share": "Compartilhar",
      "action-reply": "Responder",
      "action-forward": "Encaminhar",
      "action-archive": "Arquivar",
      "action-restore": "Restaurar",
      "action-login": "Entrar",
      "action-logout": "Sair",
      "action-signup": "Cadastrar-se",
      "action-register": "Registrar",
      "label-loading": "Carregando...",
      "label-saving": "Salvando...",
      "label-processing": "Processando...",
      "label-searching": "Buscando...",
      "label-uploading": "Enviando...",
      "label-downloading": "Baixando...",
      "label-no-results": "Nenhum resultado encontrado",
      "label-no-data": "Nenhum dado disponível",
      "label-empty": "Vazio",
      "label-none": "Nenhum",
      "label-all": "Todos",
      "label-selected": "Selecionado",
      "label-required": "Obrigatório",
      "label-optional": "Opcional",
      "label-name": "Nome",
      "label-email": "E-mail",
      "label-password": "Senha",
      "label-username": "Nome de usuário",
      "label-description": "Descrição",
      "label-status": "Status",
      "label-date": "Data",
      "label-time": "Hora",
      "label-type": "Tipo",
      "status-success": "Sucesso",
      "status-error": "Erro",
      "status-warning": "Atenção",
      "status-info": "Informação",
      "status-loading": "Carregando",
      "status-complete": "Concluído",
      "status-pending": "Pendente",
      "status-active": "Ativo",
      "status-inactive": "Inativo",
      "status-connected": "Conectado",
      "status-disconnected": "Desconectado",
      "status-online": "Online",
      "status-offline": "Offline",
      "time-now": "Agora mesmo",
      "time-today": "Hoje",
      "time-yesterday": "Ontem",
      "time-tomorrow": "Amanhã",
      "chat-title": "Chat",
      "chat-placeholder": "Digite uma mensagem...",
      "chat-send": "Enviar",
      "chat-new-conversation": "Nova Conversa",
      "chat-history": "Histórico do Chat",
      "chat-clear": "Limpar Chat",
      "chat-voice": "Entrada de voz",
      "chat-online": "Online",
      "chat-offline": "Offline",
      "drive-title": "Arquivos",
      "drive-upload": "Enviar",
      "drive-new-folder": "Nova Pasta",
      "drive-download": "Baixar",
      "drive-delete": "Excluir",
      "drive-rename": "Renomear",
      "drive-share": "Compartilhar",
      "drive-my-drive": "Meu Drive",
      "drive-shared": "Compartilhado comigo",
      "drive-recent": "Recentes",
      "drive-starred": "Com estrela",
      "drive-trash": "Lixeira",
      "drive-empty-folder": "Esta pasta está vazia",
      "drive-drop-files": "Solte arquivos aqui para enviar",
      "tasks-title": "Tarefas",
      "tasks-new": "Nova Tarefa",
      "tasks-all": "Todas as Tarefas",
      "tasks-pending": "Pendentes",
      "tasks-completed": "Concluídas",
      "tasks-overdue": "Atrasadas",
      "tasks-today": "Hoje",
      "tasks-active": "Intenções Ativas",
      "tasks-awaiting": "Aguardando Decisão",
      "tasks-paused": "Pausadas",
      "tasks-blocked": "Bloqueadas/Problemas",
      "tasks-no-tasks": "Nenhuma tarefa encontrada",
      "calendar-title": "Calendário",
      "calendar-today": "Hoje",
      "calendar-day": "Dia",
      "calendar-week": "Semana",
      "calendar-month": "Mês",
      "calendar-year": "Ano",
      "calendar-new-event": "Novo Evento",
      "calendar-my-calendars": "Meus Calendários",
      "calendar-no-events": "Nenhum evento agendado",
      "meet-title": "Reuniões",
      "meet-join": "Entrar na Reunião",
      "meet-leave": "Sair da Reunião",
      "meet-mute": "Silenciar",
      "meet-unmute": "Ativar Som",
      "meet-video-on": "Ligar Câmera",
      "meet-video-off": "Desligar Câmera",
      "meet-share-screen": "Compartilhar Tela",
      "meet-stop-sharing": "Parar Compartilhamento",
      "meet-end-call": "Encerrar Chamada",
      "meet-new-meeting": "Nova Reunião",
      "meet-active-rooms": "Salas Ativas",
      "meet-record": "Gravar",
      "email-title": "E-mail",
      "email-compose": "Escrever",
      "email-inbox": "Caixa de Entrada",
      "email-sent": "Enviados",
      "email-drafts": "Rascunhos",
      "email-trash": "Lixeira",
      "email-spam": "Spam",
      "email-starred": "Com Estrela",
      "email-to": "Para",
      "email-subject": "Assunto",
      "email-send": "Enviar",
      "email-no-messages": "Nenhuma mensagem",
      "paper-title": "Documentos",
      "paper-new-note": "Nova Nota",
      "paper-search-notes": "Buscar notas...",
      "paper-quick-start": "Início Rápido",
      "paper-template-blank": "Em Branco",
      "paper-template-meeting": "Reunião",
      "paper-template-todo": "Tarefas",
      "paper-template-research": "Pesquisa",
      "paper-untitled": "Sem título",
      "paper-placeholder": "Comece a escrever, ou digite / para comandos...",
      "paper-commands": "Comandos",
      "paper-heading1": "Título 1",
      "paper-heading1-desc": "Título de seção grande",
      "paper-heading2": "Título 2",
      "paper-heading2-desc": "Título de seção médio",
      "paper-heading3": "Título 3",
      "paper-heading3-desc": "Título de seção pequeno",
      "paper-bullet-list": "Lista com Marcadores",
      "paper-bullet-list-desc": "Criar lista com marcadores",
      "paper-numbered-list": "Lista Numerada",
      "paper-numbered-list-desc": "Criar lista numerada",
      "paper-todo-list": "Lista de Tarefas",
      "paper-todo-list-desc": "Lista com caixas de seleção",
      "paper-quote": "Citação",
      "paper-quote-desc": "Bloco de citação",
      "paper-divider": "Divisor",
      "paper-divider-desc": "Separador horizontal",
      "paper-code": "Bloco de Código",
      "paper-code-desc": "Código com destaque de sintaxe",
      "paper-callout": "Destaque",
      "paper-callout-desc": "Caixa de informação destacada",
      "paper-table": "Tabela",
      "paper-table-desc": "Inserir tabela",
      "paper-image": "Imagem",
      "paper-image-desc": "Inserir imagem",
      "paper-link": "Link",
      "paper-link-desc": "Inserir hyperlink",
      "paper-saved": "Salvo",
      "paper-saving": "Salvando...",
      "paper-word-count": "{count} palavras",
      "paper-char-count": "{count} caracteres",
      "paper-last-edited-now": "Última edição: Agora",
      "paper-export": "Exportar Documento",
      "paper-export-pdf": "Documento PDF",
      "paper-export-docx": "Documento Word",
      "paper-export-md": "Markdown",
      "paper-export-html": "HTML",
      "paper-export-txt": "Texto Simples",
      "paper-ai-assistant": "Assistente IA",
      "paper-ai-summarize": "Resumir",
      "paper-ai-expand": "Expandir",
      "paper-ai-improve": "Melhorar",
      "paper-ai-simplify": "Simplificar",
      "paper-ai-tone": "Mudar Tom",
      "paper-ai-translate": "Traduzir",
      "paper-ai-custom": "Prompt Personalizado",
      "research-title": "Pesquisa",
      "research-search-placeholder": "Pergunte qualquer coisa...",
      "research-collections": "Coleções",
      "research-new-collection": "Nova Coleção",
      "research-sources": "Fontes",
      "settings-title": "Configurações",
      "settings-general": "Geral",
      "settings-account": "Conta",
      "settings-notifications": "Notificações",
      "settings-privacy": "Privacidade",
      "settings-security": "Segurança",
      "settings-appearance": "Aparência",
      "settings-theme": "Tema",
      "settings-theme-light": "Claro",
      "settings-theme-dark": "Escuro",
      "settings-theme-system": "Sistema",
      "settings-language": "Idioma",
      "settings-timezone": "Fuso Horário",
      "settings-save": "Salvar Alterações",
      "settings-saved": "Configurações salvas com sucesso",
      "notifications-title": "Notificações",
      "notifications-clear": "Limpar tudo",
      "notifications-empty": "Nenhuma notificação",
      "admin-title": "Administração",
      "admin-panel-title": "Painel Admin",
      "admin-dashboard": "Painel",
      "admin-dashboard-title": "Painel",
      "admin-dashboard-subtitle":
        "Visão geral do sistema e estatísticas rápidas",
      "admin-users": "Usuários",
      "admin-users-subtitle": "Gerenciar contas de usuário e permissões",
      "admin-bots": "Bots",
      "admin-bots-subtitle": "Gerenciar instâncias de bots e implantações",
      "admin-system": "Sistema",
      "admin-logs": "Logs",
      "admin-settings": "Configurações",
      "admin-groups": "Grupos",
      "admin-groups-subtitle": "Gerenciar grupos e permissões de equipe",
      "admin-dns": "DNS",
      "admin-dns-subtitle":
        "Configurar domínios personalizados e configurações DNS",
      "admin-billing": "Faturamento",
      "admin-billing-subtitle":
        "Gerenciar assinatura e configurações de pagamento",
      "admin-audit": "Log de Auditoria",
      "admin-audit-subtitle": "Rastrear eventos do sistema e ações de usuários",
      "admin-quick-actions": "Ações Rápidas",
      "admin-system-health": "Saúde do Sistema",
      "admin-add-user": "Adicionar Usuário",
      "admin-add-group": "Adicionar Grupo",
      "admin-view-audit": "Ver Auditoria",
      "admin-total-users": "Total de Usuários",
      "admin-active-groups": "Grupos Ativos",
      "admin-running-bots": "Bots em Execução",
      "admin-storage-used": "Armazenamento Usado",
      "admin-create-user": "Criar Usuário",
      "admin-create-group": "Criar Grupo",
      "admin-register-dns": "Registrar DNS",
      "admin-recent-activity": "Atividade Recente",
      "admin-system-health": "Saúde do Sistema",
      "admin-dns-title": "Gerenciamento de DNS",
      "admin-dns-subtitle": "Registre e gerencie hostnames DNS para seus bots",
      "admin-dns-register": "Registrar Hostname",
      "admin-dns-registered": "Hostnames Registrados",
      "admin-dns-search": "Buscar hostnames...",
      "admin-dns-loading": "Carregando registros DNS...",
      "admin-dns-hostname": "Hostname",
      "admin-dns-record-type": "Tipo de Registro",
      "admin-dns-target": "Destino/Endereço IP",
      "admin-dns-ttl": "TTL (segundos)",
      "admin-dns-auto-ssl": "Provisionar certificado SSL automaticamente",
      "admin-dns-help-title": "Ajuda de Configuração DNS",
      "admin-groups-title": "Gerenciamento de Grupos",
      "admin-groups-subtitle": "Gerencie grupos, membros e permissões",
      "admin-groups-create": "Criar Grupo",
      "admin-groups-search": "Buscar grupos...",
      "admin-groups-loading": "Carregando grupos...",
      "admin-group-name": "Nome do Grupo",
      "admin-group-description": "Descrição",
      "admin-group-visibility": "Visibilidade",
      "admin-group-join-policy": "Política de Entrada",
      "admin-group-members": "Membros",
      "admin-group-permissions": "Permissões",
      "admin-group-settings": "Configurações",
      "admin-group-overview": "Visão Geral",
      "admin-users-title": "Gerenciamento de Usuários",
      "admin-users-add": "Adicionar Usuário",
      "admin-users-search": "Buscar usuários...",
      "analytics-title": "Análises",
      "analytics-dashboard-title": "Painel de Análises",
      "analytics-last-hour": "Última Hora",
      "analytics-last-6h": "Últimas 6 Horas",
      "analytics-last-24h": "Últimas 24 Horas",
      "analytics-last-7d": "Últimos 7 Dias",
      "analytics-last-30d": "Últimos 30 Dias",
      "validation-required": "Este campo é obrigatório",
      "validation-email-invalid":
        "Por favor, insira um endereço de e-mail válido",
      "compliance-title": "Relatório de Conformidade da API",
      "compliance-subtitle":
        "Verificação de segurança para todos os bots - Verificar senhas, segredos e problemas de segurança",
      "compliance-export": "Exportar Relatório",
      "compliance-run-scan": "Executar Verificação",
      "compliance-critical": "Crítico",
      "compliance-critical-desc": "Requer ação imediata",
      "compliance-high": "Alto",
      "compliance-high-desc": "Risco de segurança",
      "compliance-medium": "Médio",
      "compliance-medium-desc": "Deve ser tratado",
      "compliance-low": "Baixo",
      "compliance-low-desc": "Boas práticas",
      "compliance-info": "Info",
      "compliance-info-desc": "Informativo",
      "compliance-filter-severity": "Severidade:",
      "compliance-filter-type": "Tipo:",
      "compliance-issues-found": "{count} problemas encontrados",
      "dashboards-title": "Painéis",
      "dashboards-search-placeholder": "Buscar painéis...",
      "dashboards-filter-all": "Todos os Painéis",
      "dashboards-filter-sales": "Vendas",
      "dashboards-filter-marketing": "Marketing",
      "dashboards-filter-operations": "Operações",
      "dashboards-filter-finance": "Finanças",
      "dashboards-filter-hr": "RH",
      "dashboards-create": "Novo Painel",
      "dashboards-my-dashboards": "Meus Painéis",
      "dashboards-shared": "Compartilhados Comigo",
      "dashboards-templates": "Modelos",
      "dashboards-data-sources": "Fontes de Dados",
      "dashboards-add-source": "Adicionar Fonte de Dados",
      "dashboards-today": "Hoje",
      "dashboards-last-7d": "Últimos 7 Dias",
      "dashboards-last-30d": "Últimos 30 Dias",
      "dashboards-last-90d": "Últimos 90 Dias",
      "dashboards-last-year": "Último Ano",
      "dashboards-custom-range": "Período Personalizado",
      "dashboards-ask-data": "Pergunte sobre seus dados",
      "dashboards-query-placeholder":
        "Ex: Mostre vendas por região no último trimestre...",
      "dashboards-all-sources": "Todas as Fontes de Dados",
      "dashboards-analyzing": "Analisando seus dados...",
      "dashboards-create-title": "Criar Novo Painel",
      "dashboards-name": "Nome",
      "dashboards-name-placeholder": "Meu Painel",
      "dashboards-description": "Descrição",
      "dashboards-description-placeholder":
        "Descreva o que este painel mostra...",
      "dashboards-layout": "Layout",
      "dashboards-layout-12col": "12 Colunas",
      "dashboards-layout-6col": "6 Colunas",
      "dashboards-layout-4col": "4 Colunas",
      "dashboards-tags": "Tags",
      "dashboards-tags-placeholder": "vendas, marketing",
      "dashboards-public": "Tornar painel público",
      "dashboards-start-from": "Começar de",
      "dashboards-blank": "Em Branco",
      "dashboards-sales-template": "Vendas",
      "dashboards-marketing-template": "Marketing",
      "dashboards-operations-template": "Operações",
      "dashboards-add-data-source": "Adicionar Fonte de Dados",
      "dashboards-source-name": "Nome",
      "dashboards-source-name-placeholder": "Meu Banco de Dados",
      "dashboards-source-type": "Tipo",
      "dashboards-select-type": "Selecione o tipo...",
      "dashboards-databases": "Bancos de Dados",
      "dashboards-warehouses": "Data Warehouses na Nuvem",
      "dashboards-apis": "APIs",
      "dashboards-files": "Arquivos",
      "dashboards-internal": "Interno",
      "dashboards-source-description": "Descrição",
      "dashboards-source-description-placeholder": "Descrição opcional...",
      "dashboards-test-connection": "Testar Conexão",
      "dashboards-add-widget": "Adicionar Widget",
      "dashboards-charts": "Gráficos",
      "dashboards-data-display": "Exibição de Dados",
      "dashboards-content": "Conteúdo",
      "dashboards-filters": "Filtros",
      "dashboards-host": "Host",
      "dashboards-port": "Porta",
      "dashboards-database": "Banco de Dados",
      "dashboards-username": "Usuário",
      "dashboards-password": "Senha",
      "dashboards-use-ssl": "Usar SSL",
      "dashboards-api-url": "URL da API",
      "dashboards-api-key": "Chave da API",
      "dashboards-file-url": "URL ou Caminho do Arquivo",
      "dashboards-connection-string": "String de Conexão",
      "sources-title": "Fontes",
      "sources-subtitle": "Gerenciar fontes de dados, prompts e integrações",
      "sources-search": "Buscar fontes...",
      "sources-prompts": "Prompts",
      "sources-templates": "Modelos",
      "sources-news": "Notícias",
      "sources-mcp-servers": "Servidores MCP",
      "sources-llm-tools": "Ferramentas LLM",
      "sources-models": "Modelos",
      "sources-repositories": "Repositórios",
      "sources-apps": "Apps",
      "attendant-title": "Console do Atendente",
      "attendant-subtitle": "Gerenciamento de fila de suporte humano",
      "attendant-queue": "Fila",
      "attendant-active": "Chats Ativos",
      "attendant-resolved": "Resolvidos",
      "attendant-assign": "Atribuir",
      "attendant-transfer": "Transferir Conversa",
      "attendant-resolve": "Resolver",
      "attendant-no-items": "Nenhum item na fila",
      "attendant-crm-disabled": "Recursos de CRM Não Habilitados",
      "attendant-status-online": "Online - Pronto para conversas",
      "attendant-select-conversation": "Selecione uma conversa",
      "modal-confirm-title": "Confirmar Ação",
      "modal-confirm-message": "Tem certeza que deseja prosseguir?",
      "modal-delete-title": "Confirmação de Exclusão",
      "modal-delete-message": "Esta ação não pode ser desfeita. Tem certeza?",
      "error-http-400": "Requisição inválida. Por favor, verifique seus dados.",
      "error-http-401": "Autenticação necessária. Por favor, faça login.",
      "error-http-403": "Você não tem permissão para acessar este recurso.",
      "error-http-404": "Não encontrado.",
      "error-http-500":
        "Erro interno do servidor. Por favor, tente novamente mais tarde.",
      "error-network": "Erro de rede. Por favor, verifique sua conexão.",
      "error-unknown": "Ocorreu um erro inesperado.",
      "pagination-first": "Primeira",
      "pagination-previous": "Anterior",
      "pagination-next": "Próxima",
      "pagination-last": "Última",
      "a11y-skip-to-content": "Pular para o conteúdo principal",
      "a11y-loading": "Carregando, por favor aguarde",
      "a11y-menu-open": "Abrir menu",
      "a11y-menu-close": "Fechar menu",
    },
  };

  class I18n {
    constructor() {
      this.locale = this.detectLocale();
      this.messages = {};
      this.loaded = false;
      this.loading = null;
    }

    detectLocale() {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return stored;
      }
      var htmlLang = document.documentElement.lang;
      if (htmlLang && htmlLang !== "en") {
        return htmlLang;
      }
      var browserLang = navigator.language || navigator.userLanguage;
      if (browserLang) {
        return browserLang;
      }
      return DEFAULT_LOCALE;
    }

    async init() {
      if (this.loading) {
        return this.loading;
      }
      this.loading = this.loadTranslations();
      await this.loading;
      this.loading = null;
      return this;
    }

    async loadTranslations() {
      var cacheKey = "gb-i18n-" + this.locale;
      var cached = this.loadFromCache(cacheKey);
      if (cached) {
        this.messages = cached;
        this.loaded = true;
        this.translatePage();
        return;
      }
      try {
        var response = await fetch("/api/i18n/" + this.locale, {
          headers: {
            Accept: "application/json",
            "Accept-Language": this.locale,
          },
        });
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        var data = await response.json();
        this.messages = data.translations || data;
        this.loaded = true;
        this.saveToCache(cacheKey, this.messages);
        this.translatePage();
      } catch (error) {
        console.warn(
          "Failed to load translations from API, using fallback:",
          error,
        );
        this.useFallbackTranslations();
      }
    }

    useFallbackTranslations() {
      var baseLocale = this.locale.split("-")[0];
      this.messages =
        FALLBACK_TRANSLATIONS[this.locale] ||
        FALLBACK_TRANSLATIONS[baseLocale] ||
        FALLBACK_TRANSLATIONS[DEFAULT_LOCALE] ||
        {};
      this.loaded = true;
      this.translatePage();
    }

    loadFromCache(key) {
      try {
        var cached = localStorage.getItem(key);
        if (!cached) {
          return null;
        }
        var data = JSON.parse(cached);
        if (Date.now() - data.timestamp > CACHE_TTL_MS) {
          localStorage.removeItem(key);
          return null;
        }
        return data.messages;
      } catch (e) {
        return null;
      }
    }

    saveToCache(key, messages) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            timestamp: Date.now(),
            messages: messages,
          }),
        );
      } catch (e) {
        // Storage full or disabled
      }
    }

    t(key, args) {
      var message = this.messages[key];
      if (!message) {
        var baseLocale = this.locale.split("-")[0];
        var fallback =
          FALLBACK_TRANSLATIONS[this.locale] ||
          FALLBACK_TRANSLATIONS[baseLocale] ||
          FALLBACK_TRANSLATIONS[DEFAULT_LOCALE];
        message = fallback ? fallback[key] : null;
      }
      if (!message) {
        return "[" + key + "]";
      }
      if (args) {
        message = this.interpolate(message, args);
      }
      return message;
    }

    interpolate(template, args) {
      var result = template;
      for (var key in args) {
        if (args.hasOwnProperty(key)) {
          var value = args[key];
          result = result.replace(
            new RegExp("\\{\\s*\\$" + key + "\\s*\\}", "g"),
            value,
          );
          result = result.replace(new RegExp("\\{" + key + "\\}", "g"), value);
        }
      }
      return result;
    }

    translatePage() {
      this.translateElements("[data-i18n]", "textContent", "i18n");
      this.translateElements(
        "[data-i18n-placeholder]",
        "placeholder",
        "i18nPlaceholder",
      );
      this.translateElements("[data-i18n-title]", "title", "i18nTitle");
      this.translateElements(
        "[data-i18n-aria-label]",
        "ariaLabel",
        "i18nAriaLabel",
      );
    }

    translateElements(selector, property, dataAttr) {
      var self = this;
      var elements = document.querySelectorAll(selector);
      elements.forEach(function (el) {
        var key = el.dataset[dataAttr];
        if (!key) return;
        var args = null;
        var argsAttr = el.dataset.i18nArgs;
        if (argsAttr) {
          try {
            args = JSON.parse(argsAttr);
          } catch (e) {
            // ignore
          }
        }
        var translated = self.t(key, args);
        if (translated.startsWith("[") && translated.endsWith("]")) return;
        if (property === "textContent") {
          el.textContent = translated;
        } else {
          el[property] = translated;
        }
      });
    }

    async setLocale(locale) {
      if (this.locale === locale) return;
      this.locale = locale;
      this.loaded = false;
      localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
      localStorage.removeItem("gb-i18n-" + locale);
      await this.loadTranslations();
      document.dispatchEvent(
        new CustomEvent("i18n:localeChanged", {
          detail: { locale: locale },
        }),
      );
    }

    getLocale() {
      return this.locale;
    }

    getAvailableLocales() {
      return ["en", "pt-BR"];
    }

    getLocaleDisplayName(locale) {
      var names = {
        en: "English",
        "pt-BR": "Português (Brasil)",
        es: "Español",
        fr: "Français",
        de: "Deutsch",
        "zh-CN": "简体中文",
      };
      return names[locale] || locale;
    }

    formatNumber(value, options) {
      try {
        return new Intl.NumberFormat(this.locale, options).format(value);
      } catch (e) {
        return String(value);
      }
    }

    formatDate(date, options) {
      var dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return String(date);
      try {
        return new Intl.DateTimeFormat(this.locale, options).format(dateObj);
      } catch (e) {
        return dateObj.toISOString();
      }
    }

    formatRelativeTime(date) {
      var dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return String(date);
      var now = Date.now();
      var diffMs = now - dateObj.getTime();
      var diffMin = Math.floor(diffMs / 60000);
      var diffHour = Math.floor(diffMin / 60);
      var diffDay = Math.floor(diffHour / 24);
      if (diffMin < 1) return this.t("time-now") || "Just now";
      if (diffMin < 60) return diffMin + "m ago";
      if (diffHour < 24) return diffHour + "h ago";
      if (diffDay < 30) return diffDay + "d ago";
      return this.formatDate(dateObj, { dateStyle: "medium" });
    }
  }

  var i18n = new I18n();

  function setupHtmxListeners() {
    document.body.addEventListener("htmx:afterSwap", function () {
      if (i18n.loaded)
        setTimeout(function () {
          i18n.translatePage();
        }, 10);
    });
    document.body.addEventListener("htmx:afterSettle", function () {
      if (i18n.loaded)
        setTimeout(function () {
          i18n.translatePage();
        }, 10);
    });
    document.body.addEventListener("htmx:load", function () {
      if (i18n.loaded)
        setTimeout(function () {
          i18n.translatePage();
        }, 10);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      i18n.init();
      setupHtmxListeners();
    });
  } else {
    i18n.init();
    setupHtmxListeners();
  }

  window.i18n = i18n;
  window.t = function (key, args) {
    return i18n.t(key, args);
  };
})();
