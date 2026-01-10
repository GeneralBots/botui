# SMB Suite Implementation TODO

## Overview
Complete sovereign SMB suite with CRM, Billing, Products, Tickets, and Forms.
Following Microsoft Dynamics nomenclature (simplified for SMB).

---

## ✅ COMPLETED

- [x] Create folder structure (crm, billing, products, tickets, forms)
- [x] Create TODO.md
- [x] Create `/suite/crm/crm.html` - Pipeline view (Kanban style)
- [x] Create `/suite/crm/crm.css` - Styling
- [x] Create `/suite/billing/billing.html` - Invoice list + dashboard
- [x] Create `/suite/billing/billing.css` - Styling
- [x] Create `/suite/products/products.html` - Product/Service catalog
- [x] Create `/suite/products/products.css` - Styling
- [x] Create `/suite/tickets/tickets.html` - AI-assisted support tickets
- [x] Create `/suite/tickets/tickets.css` - Styling
- [x] Create `/suite/forms/forms.html` - Redirect to Tasks with AI prompt
- [x] Add CRM, Billing, Products, Tickets, Forms to dropdown menu
- [x] Add i18n entries (en, pt-BR) for nav-crm, nav-billing, nav-products, nav-tickets, nav-forms

---

## 🔄 IN PROGRESS

### Phase 1: Create HTML/CSS for New Apps

#### 1.1 CRM (`/suite/crm/`)
- [x] `crm.html` - Pipeline view (Kanban style)
- [x] `crm.css` - Styling
- [x] Entities (Dynamics nomenclature):
  - **Lead** - Unqualified prospect
  - **Opportunity** - Qualified, in sales process
  - **Account** - Company (converted customer)
  - **Contact** - Person at Account
  - **Activity** - Linked tasks/calls/emails

#### 1.2 Billing (`/suite/billing/`)
- [x] `billing.html` - Invoice list + dashboard
- [x] `billing.css` - Styling
- [x] Entities:
  - **Invoice** - Bill to customer
  - **Payment** - Payment received
  - **Quote** - Price quotation → converts to Invoice

#### 1.3 Products (`/suite/products/`)
- [x] `products.html` - Product/Service catalog
- [x] `products.css` - Styling
- [x] Entities:
  - **Product** - Physical/digital product
  - **Service** - Service offering
  - **PriceList** - Pricing tiers

#### 1.4 Tickets (`/suite/tickets/`)
- [x] `tickets.html` - AI-assisted support tickets
- [x] `tickets.css` - Styling
- [x] Entities:
  - **Case** - Support ticket (Dynamics term)
  - **Resolution** - AI-suggested solutions

#### 1.5 Forms (`/suite/forms/`)
- [x] `forms.html` - Redirect to Tasks with AI prompt
- [x] Behavior: "Create a form for me about [topic]"

---

## 📋 TODO

### Phase 2: Menu Integration (`/suite/index.html`)

- [x] Add CRM to dropdown menu
- [x] Add Billing to dropdown menu  
- [x] Add Products to dropdown menu
- [x] Add Tickets to dropdown menu
- [x] Add Forms to dropdown menu
- [ ] Update header tabs (add CRM)
- [ ] Update CSS breakpoints (`/suite/css/app.css`)

### Phase 3: i18n Updates

#### English (`/suite/js/i18n.js`)
- [x] nav-crm, nav-billing, nav-products, nav-tickets, nav-forms
- [ ] CRM: lead, opportunity, account, contact, pipeline, qualify, convert, won, lost
- [ ] Billing: invoice, payment, quote, due-date, overdue, paid, pending
- [ ] Products: product, service, price, sku, category, unit
- [ ] Tickets: case, priority, status, assigned, resolved, escalate

#### Portuguese (`/suite/js/i18n.js`)
- [x] nav-crm: "CRM"
- [x] nav-billing: "Faturamento"
- [x] nav-products: "Produtos"
- [x] nav-tickets: "Chamados"
- [x] nav-forms: "Formulários"
- [ ] All entity labels in Portuguese

### Phase 4: Chat @ Mentions

- [ ] Add @ autocomplete in chat input
- [ ] Entity types to reference:
  - @lead:name
  - @opportunity:name
  - @account:name
  - @contact:name
  - @invoice:number
  - @case:number
  - @product:name
- [ ] Show entity card on hover
- [ ] Navigate to entity on click

### Phase 5: Reports (in Analytics/Dashboards)

#### CRM Reports
- [ ] Sales Pipeline (funnel)
- [ ] Lead Conversion Rate
- [ ] Opportunities by Stage
- [ ] Won/Lost Analysis
- [ ] Sales Forecast

#### Billing Reports
- [ ] Revenue Summary
- [ ] Aging Report (overdue invoices)
- [ ] Payment History
- [ ] Monthly Revenue

#### Support Reports
- [ ] Open Cases by Priority
- [ ] Resolution Time (avg)
- [ ] Cases by Category
- [ ] AI Resolution Rate

### Phase 6: BotBook Documentation

- [ ] Add CRM chapter
- [ ] Add Billing chapter
- [ ] Add Products chapter
- [ ] Add Tickets chapter
- [ ] Document @ mentions
- [ ] Update SUMMARY.md

---

## File Checklist

### New Files to Create:
```
/suite/crm/crm.html
/suite/crm/crm.css
/suite/billing/billing.html
/suite/billing/billing.css
/suite/products/products.html
/suite/products/products.css
/suite/tickets/tickets.html
/suite/tickets/tickets.css
/suite/forms/forms.html
```

### Files to Update:
```
/suite/index.html        - Menu items + HTMX routes
/suite/css/app.css       - Breakpoints for new tabs
/suite/js/i18n/en.json   - English labels
/suite/js/i18n/pt.json   - Portuguese labels
/suite/chat/chat.html    - @ mention UI
/suite/chat/chat.js      - @ autocomplete logic
```

### BotBook Files:
```
/botbook/src/SUMMARY.md           - Add new chapters
/botbook/src/XX-crm/              - CRM documentation
/botbook/src/XX-billing/          - Billing documentation
/botbook/src/XX-products/         - Products documentation
/botbook/src/XX-tickets/          - Tickets documentation
```

---

## Entity Relationships (Dynamics Style)

```
Lead ──(qualify)──► Opportunity ──(convert)──► Account + Contact
                         │
                         ▼
                       Quote ──(accept)──► Invoice ──(pay)──► Payment
                         │
                         └── Product/Service (line items)

Account ◄──► Contact (1:N)
Account ◄──► Case/Ticket (1:N)
Account ◄──► Invoice (1:N)
Account ◄──► Opportunity (1:N)
```

---

## HTMX Patterns to Use

### List with selection
```html
<div hx-get="/api/crm/leads" hx-trigger="load" hx-target="#lead-list">
    Loading...
</div>
```

### Pipeline drag-drop
```html
<div class="pipeline-column" 
     hx-post="/api/crm/opportunity/{id}/stage" 
     hx-trigger="drop"
     hx-vals='{"stage": "qualified"}'>
```

### @ Mention autocomplete
```html
<input type="text" 
       hx-get="/api/search/entities?q=" 
       hx-trigger="keyup changed delay:300ms"
       hx-target="#mention-dropdown">
```

---

## Notes

- **Dynamics Nomenclature**: Lead, Opportunity, Account, Contact, Case, Quote, Invoice
- **SMB Focus**: Simple, not enterprise complexity
- **AI-First**: Tickets use AI suggestions, Forms use AI generation
- **HTMX**: All interactions via HTMX
- **Sovereign**: No external dependencies, all data local
- **@ Mentions**: Reference any entity in chat with @type:name