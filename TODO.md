# SMB Suite Implementation TODO

## Overview
Complete sovereign SMB suite with CRM, Billing, Products, Tickets, and Forms.
Following Microsoft Dynamics nomenclature (simplified for SMB).

---

## ✅ COMPLETED

### Phase 1: Create HTML/CSS for New Apps ✅

#### 1.1 CRM (`/suite/crm/`) ✅
- [x] `crm.html` - Pipeline view (Kanban style)
- [x] `crm.css` - Styling
- [x] Entities (Dynamics nomenclature):
  - **Lead** - Unqualified prospect
  - **Opportunity** - Qualified, in sales process
  - **Account** - Company (converted customer)
  - **Contact** - Person at Account
  - **Activity** - Linked tasks/calls/emails

#### 1.2 Billing (`/suite/billing/`) ✅
- [x] `billing.html` - Invoice list + dashboard
- [x] `billing.css` - Styling
- [x] Entities:
  - **Invoice** - Bill to customer
  - **Payment** - Payment received
  - **Quote** - Price quotation → converts to Invoice

#### 1.3 Products (`/suite/products/`) ✅
- [x] `products.html` - Product/Service catalog
- [x] `products.css` - Styling
- [x] Entities:
  - **Product** - Physical/digital product
  - **Service** - Service offering
  - **PriceList** - Pricing tiers

#### 1.4 Tickets (`/suite/tickets/`) ✅
- [x] `tickets.html` - AI-assisted support tickets
- [x] `tickets.css` - Styling
- [x] Entities:
  - **Case** - Support ticket (Dynamics term)
  - **Resolution** - AI-suggested solutions

#### 1.5 Forms (`/suite/forms/`) ✅
- [x] `forms.html` - Redirect to Tasks with AI prompt
- [x] Behavior: "Create a form for me about [topic]"

### Phase 2: Menu Integration (`/suite/index.html`) ✅

- [x] Add CRM to dropdown menu
- [x] Add Billing to dropdown menu  
- [x] Add Products to dropdown menu
- [x] Add Tickets to dropdown menu
- [x] Add Forms to dropdown menu
- [x] Update header tabs (add CRM)
- [x] Update CSS breakpoints (`/suite/css/app.css`)

### Phase 3: i18n Updates ✅

**NOTE:** Translations are stored in `.ftl` files in `botlib/locales/` - NOT in JS files.

#### English (`botlib/locales/en/ui.ftl`) ✅
- [x] nav-crm, nav-billing, nav-products, nav-tickets, nav-forms
- [x] CRM: lead, opportunity, account, contact, pipeline, qualify, convert, won, lost
- [x] Billing: invoice, payment, quote, due-date, overdue, paid, pending
- [x] Products: product, service, price, sku, category, unit
- [x] Tickets: case, priority, status, assigned, resolved, escalate

#### Portuguese (`botlib/locales/pt-BR/ui.ftl`) ✅
- [x] nav-crm: "CRM"
- [x] nav-billing: "Faturamento"
- [x] nav-products: "Produtos"
- [x] nav-tickets: "Chamados"
- [x] nav-forms: "Formulários"
- [x] All entity labels in Portuguese

#### Spanish (`botlib/locales/es/ui.ftl`) ✅
- [x] All navigation and entity labels in Spanish

---

## 📋 TODO

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

## File Structure

### i18n Files (Fluent format .ftl):
```
botlib/locales/
├── en/
│   └── ui.ftl          # English translations
├── pt-BR/
│   └── ui.ftl          # Portuguese translations
└── es/
    └── ui.ftl          # Spanish translations
```

### Suite Files:
```
botui/ui/suite/
├── crm/
│   ├── crm.html
│   └── crm.css
├── billing/
│   ├── billing.html
│   └── billing.css
├── products/
│   ├── products.html
│   └── products.css
├── tickets/
│   ├── tickets.html
│   └── tickets.css
├── forms/
│   └── forms.html
├── index.html          # Menu items + HTMX routes
└── css/
    └── app.css         # Breakpoints for tabs
```

### BotBook Files (TODO):
```
botbook/src/
├── SUMMARY.md           # Add new chapters
├── XX-crm/              # CRM documentation
├── XX-billing/          # Billing documentation
├── XX-products/         # Products documentation
└── XX-tickets/          # Tickets documentation
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

- **i18n Location**: All translations in `botlib/locales/{locale}/ui.ftl` files (Fluent format)
- **Dynamics Nomenclature**: Lead, Opportunity, Account, Contact, Case, Quote, Invoice
- **SMB Focus**: Simple, not enterprise complexity
- **AI-First**: Tickets use AI suggestions, Forms use AI generation
- **HTMX**: All interactions via HTMX
- **Sovereign**: No external dependencies, all data local
- **@ Mentions**: Reference any entity in chat with @type:name