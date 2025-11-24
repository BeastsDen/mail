# Design Guidelines: Email Management Platform

## Design Approach

**Design System Foundation**: Hybrid approach combining **Linear's** modern productivity aesthetic with **Fluent Design's** Microsoft ecosystem patterns, optimized for data-dense business applications.

**Core Principles**:
- Clarity over decoration - information hierarchy is paramount
- Role-based visual distinction without overwhelming contrast
- Scannable metrics and efficient workflows
- Professional, trustworthy presentation for business context

---

## Typography

**Font Stack**: 
- Primary: Inter (Google Fonts) - body text, UI elements, metrics
- Monospace: JetBrains Mono - email addresses, data tables, logs

**Hierarchy**:
- Page Titles: text-2xl/text-3xl, font-semibold
- Section Headers: text-lg/text-xl, font-medium  
- Metrics/Stats: text-3xl/text-4xl, font-bold (dashboard numbers)
- Body Text: text-sm/text-base, font-normal
- Labels/Meta: text-xs/text-sm, font-medium, uppercase tracking-wide

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-6, mb-8)

**Grid Structure**:
- Sidebar navigation: Fixed 240px width (w-60)
- Main content: flex-1 with max-w-7xl container
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Data tables: Full-width within container

**Containers**:
- Page padding: px-6 py-8 (desktop), px-4 py-6 (mobile)
- Card padding: p-6
- Section spacing: space-y-8 between major sections

---

## Component Library

### Navigation
**Sidebar** (Admin & Sales - different menu items):
- Fixed left sidebar with role badge at top
- Icon + label menu items with active state indicator (left border accent)
- User profile section at bottom with role display
- Collapsible on mobile (hamburger menu)

**Top Bar**:
- Breadcrumb navigation path
- Quick actions (search, notifications, profile dropdown)
- Height: h-16

### Dashboard Components

**Stat Cards** (Sales Dashboard):
- Compact card design with icon, label, and large number
- 4-column grid on desktop: Emails Sent Today/Week/Month/Year
- 3-column grid: Replies Received, Hot Leads, Cold Leads (with visual priority on Hot)
- Additional metrics row: Dead Leads, Open Rate
- Each card: Rounded corners (rounded-lg), subtle border, minimal shadow

**Analytics Charts**:
- Line chart for email sending trends over time
- Bar chart for lead categorization breakdown
- Clean, minimal axis styling

### Data Tables

**Email List/Thread View**:
- Striped rows for readability (alternating subtle background)
- Columns: Checkbox, Status Indicator, Subject, Recipient, Timestamp, Lead Tag, Actions
- Lead tags as colored badges (Hot: prominent accent, Cold: muted, Dead: subtle gray)
- Hover state for entire row
- Action buttons (dropdown menu): Mark as Hot/Cold/Dead, View Thread, Archive

**Dataset Management Table** (Admin):
- Columns: Dataset Name, Records Count, Upload Date, Status, Actions
- Action buttons: Edit, Delete, Download

**Template Management Table** (Admin):
- Columns: Template Name, Variables Used, Created Date, Last Used, Actions
- Preview modal on click

### Forms

**Email Sending Interface**:
- Two-column layout: Left (form), Right (preview pane)
- Form fields: Dataset selector (dropdown), Template selector (dropdown), Schedule options
- Preview pane shows rendered email with populated variables in real-time
- Large "Send Emails" button at bottom (primary CTA)

**Dataset Upload**:
- Drag-and-drop zone with file icon and helper text
- Field mapping interface after upload (match CSV columns to system fields)
- Table preview showing first 5 rows

**Template Editor**:
- Rich text editor with variable insertion buttons ({{name}}, {{company}}, etc.)
- Side panel showing available variables from datasets
- Live preview toggle

### Status Indicators
- Delivery status badges: Sent (blue), Delivered (green), Failed (red), Pending (yellow)
- Lead category badges: Hot (red/orange), Cold (blue), Dead (gray) with dot indicator
- Notification dots for unread replies

### Activity Logs
- Timeline-style layout with timestamp on left, activity description on right
- Filter by user, action type, date range
- Expandable entries for detailed information

---

## Interaction Patterns

**Navigation**: Instant page transitions, active state persistence, breadcrumb updates
**Data Loading**: Skeleton loaders for tables and cards
**Notifications**: Toast messages (top-right) for actions: "Email sent successfully", "Template saved"
**Modals**: Centered overlays with backdrop blur for confirmations, detail views
**Dropdowns**: Smooth slide-down menus with subtle shadow

**Animations**: Minimal and purposeful
- Hover states: Subtle scale or background transition (200ms)
- Page transitions: None (instant)
- Toast notifications: Slide-in from right

---

## Role-Based Visual Distinction

**Admin Interface**:
- Badge indicator: "Admin" in header with distinct styling
- Access to Settings, Users, All Logs navigation items
- Broader analytics overview (system-wide stats)

**Sales Interface**:
- Badge indicator: "Sales" 
- Limited navigation: Dashboard, Send Email, My Emails, Datasets
- Personal performance metrics only

---

## Icons
**Library**: Heroicons (via CDN)
- Navigation: outline style
- Actions/buttons: solid style for primary, outline for secondary
- Status indicators: Custom colored dots with icon overlay

---

## Images
No hero images for this application. This is a data-centric dashboard tool where:
- Empty states use illustrations (undraw.co style) for datasets, templates, email lists
- User avatars in profile sections (initials-based fallback)
- Email preview pane may show email content with basic image rendering

---

## Key Pages Structure

1. **Login**: Centered card with Replit Auth, role assignment post-login
2. **Admin Dashboard**: 3-column stat grid, recent activity feed, system health indicators
3. **Sales Dashboard**: 4-column metrics grid, charts, hot leads quick view
4. **Send Email Page**: Split view (form + preview)
5. **Email Inbox/Threads**: Table with filtering, categorization interface
6. **Admin Settings**: Tabbed interface (Templates, Datasets, Users, System Logs)
7. **Dataset Management**: Upload interface + data table
8. **Template Editor**: Full-width editor with preview toggle