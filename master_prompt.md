<USER_REQUEST>
# ULTRA-ADVANCED MASTER PROMPT
# APEX ELECTRONICS — ENTERPRISE DISTRIBUTION MANAGEMENT PLATFORM

## 1. YOUR ROLE

Act as a complete senior engineering team consisting of:

- Principal Software Architect
- Senior React/Next.js Engineer
- Senior Backend Engineer
- MongoDB Database Architect
- UI/UX Product Designer
- DevOps and Infrastructure Engineer
- Cybersecurity Engineer
- QA Automation Engineer

Your mission is to build a complete, production-oriented, enterprise-grade Mobile & Electronics Distribution Management System.

PROJECT NAME: APEX ELECTRONICS
PRODUCT: Enterprise Distribution Management Platform

This is not a static dashboard design task.

You must implement the frontend, backend, database, APIs, authentication, business logic, permissions, integrations, validations, and testing.

The application must work with real persistent data.

---

# 2. FIRST: ANALYZE THE EXISTING PROJECT

Before writing code:

1. Inspect the complete existing project.
2. Identify the existing frontend framework.
3. Identify the backend framework and architecture.
4. Inspect MongoDB configuration and existing schemas.
5. Inspect authentication and authorization.
6. Identify existing reusable components.
7. Identify existing HRMS functionality.
8. Identify existing routes and APIs.
9. Identify broken or incomplete functionality.
10. Check dependencies and environment configuration.

IMPORTANT:

- Preserve the existing SmartAttendance Pro HRMS.
- Do not delete working functionality.
- Reuse existing authentication and employee records where appropriate.
- Avoid duplicate models and APIs.
- Integrate the distribution system cleanly into the existing architecture.
- Do not rewrite the entire project without a technical reason.

After inspection, create an implementation plan and execute it.

Do not stop after producing the plan.

---

# 3. ULTRA-PREMIUM UI/UX DESIGN SYSTEM

The design must match the visual quality of a premium enterprise SaaS platform.

Reference direction:

- Midnight navy background.
- Deep indigo surfaces.
- Electric violet and purple gradients.
- Premium white typography.
- Subtle glassmorphism.
- Soft shadows.
- Fine borders.
- Elegant rounded cards.
- Professional iconography.
- Smooth micro-interactions.
- High-quality product photography.

Suggested colors:

Primary background: #080A1B
Secondary background: #10132A
Card background: #151A38
Primary purple: #713BFF
Secondary purple: #9A5CFF
Accent blue: #398BFF
Success: #20D69A
Warning: #FFB547
Danger: #FF5574
Primary text: #F8F9FF
Secondary text: #A6ADC8

Create reusable design tokens for:
- Colors.
- Typography.
- Spacing.
- Border radius.
- Shadows.
- Gradients.
- Buttons.
- Inputs.
- Tables.
- Cards.
- Modals.
- Notifications.

UI REQUIREMENTS:

- Consistent component hierarchy.
- No unnecessary visual clutter.
- Clear typography hierarchy.
- Professional data visualization.
- Responsive sidebar.
- Mobile navigation drawer.
- Loading skeletons.
- Empty states.
- Error states.
- Success feedback.
- Keyboard accessibility.
- Consistent hover and focus states.

The final UI should look like a premium enterprise product, not a generic admin template.

---

# 4. APPLICATION LAYOUT

Build a complete enterprise dashboard.

## Sidebar navigation

1. Dashboard
2. Products
3. Categories
4. Brands
5. Inventory
6. Orders
7. Quotations
8. Retailers
9. Retailer Applications
10. Sales Team
11. Field Visits
12. Deliveries
13. Warehouses
14. Distribution Network
15. Invoices
16. Payments
17. Dealer Ledger
18. Promotions
19. Reports & Analytics
20. Notifications
21. User Management
22. Audit Logs
23. Settings

Include:
- Collapsible sidebar.
- Active route indicator.
- Navigation icons.
- Notification counters from actual data.
- Role-based menu visibility.
- Responsive mobile navigation.

## Top navigation

Include:
- Company/workspace selector.
- Global search.
- Keyboard shortcut support.
- Notification center.
- Help center.
- Date-range selector.
- User profile.
- Account settings.
- Logout.

---

# 5. ENTERPRISE DISTRIBUTION DASHBOARD

Build the main dashboard at exceptional visual quality.

## KPI cards

Display actual database-driven metrics:

- Active Retailers.
- Total Orders.
- Units Sold.
- Sales Revenue.
- Payments Collected.
- Outstanding Payments.
- Pending Orders.
- Available Inventory.

Each card should include:
- Icon.
- Current value.
- Comparison with previous period.
- Percentage change.
- Small trend visualization where appropriate.
- Tooltip with calculation details.

Never hardcode statistics.

If no data exists, show a proper zero state.

## Analytics

Create interactive charts:

1. Monthly revenue.
2. Daily order volume.
3. Product category sales.
4. Brand performance.
5. Retailer acquisition.
6. Inventory movement.
7. Payment collection.
8. Outstanding credit.
9. Sales representative performance.
10. Regional distribution performance.

Features:
- Daily, weekly, monthly and yearly filters.
- Custom date ranges.
- Interactive tooltips.
- Export functionality.
- Server-side aggregation for large datasets.

## Dashboard sections

Include:

- Recent Orders.
- Latest Retailer Registrations.
- Low Stock Alerts.
- Top Selling Products.
- Top Performing Brands.
- Pending Payments.
- Recent Deliveries.
- Sales Team Performance.
- Distribution Network Map.
- System Activity Feed.

All sections must use actual API data.

---

# 6. PRODUCT MANAGEMENT SYSTEM

Build an advanced product management module.

Categories:

- Smartphones.
- Tablets.
- Smartwatches.
- Wireless Earbuds.
- Headphones.
- Chargers.
- Power Banks.
- Mobile Accessories.
- Speakers.
- Laptops.
- Smart Electronics.

Product fields:

- Product Name.
- Brand.
- Model.
- SKU.
- Barcode.
- Category.
- Description.
- Product Images.
- Specifications.
- Warranty.
- MRP.
- Dealer Price.
- Purchase Price.
- Tax Configuration.
- Reorder Level.
- Status.

Support product variants:

- Color.
- RAM.
- Storage.
- Model.
- Package.
- Variant SKU.
- Variant Barcode.
- Variant Pricing.

Device-level tracking:

- IMEI 1.
- IMEI 2.
- Serial Number.
- Purchase Batch.
- Warehouse.
- Stock Status.
- Warranty Start.
- Warranty End.

Requirements:

- IMEI uniqueness validation.
- Barcode scanning support.
- Bulk product import.
- Bulk export.
- Product image upload.
- Product history.
- Stock movement history.
- Product search and filtering.
- Product activation/deactivation.

Never expose confidential IMEI or serial data to unauthorized users.

---

# 7. INVENTORY AND WAREHOUSE MANAGEMENT

Implement real inventory management.

Features:

- Multiple warehouses.
- Warehouse-specific inventory.
- Stock transfers.
- Stock reservations.
- Incoming stock.
- Outgoing stock.
- Damaged stock.
- Returned stock.
- Available stock.
- Reserved stock.
- Reorder alerts.
- Inventory valuation.
- Stock reconciliation.

Every inventory movement must create a traceable transaction.

Prevent negative stock unless a specifically authorized and audited override is enabled.

Use database transactions where required to preserve inventory consistency.

---

# 8. RETAILER MANAGEMENT

Build a complete retailer CRM.

Retailer information:

- Business Name.
- Owner Name.
- Dealer Code.
- Phone Number.
- Email.
- GSTIN.
- Business Address.
- City.
- State.
- PIN Code.
- Assigned Sales Representative.
- Credit Limit.
- Payment Terms.
- Account Status.
- Registration Documents.
- Shop Photographs.

Retailer statuses:

- Application Pending.
- Under Review.
- Active.
- Suspended.
- Rejected.

Retailer profile must contain:

- Business information.
- Order history.
- Payment history.
- Invoices.
- Dealer ledger.
- Outstanding balance.
- Credit utilization.
- Delivery history.
- Visit history.
- Support tickets.

---

# 9. SALES TEAM AND FIELD OPERATIONS

Build a complete field sales management module.

Features:

- Employee assignment.
- Sales territory management.
- Daily visit planning.
- GPS-based check-in.
- GPS-based check-out.
- Visit photographs.
- Retailer interaction notes.
- Product demonstrations.
- Order booking.
- Follow-up scheduling.
- Sales targets.
- Employee performance.

Capture location only with appropriate permissions and consent.

Support mobile-friendly field sales workflows.

Never fabricate GPS coordinates or visit records.

---

# 10. ORDER MANAGEMENT

Build a complete order lifecycle.

Order statuses:

- Draft.
- Submitted.
- Confirmed.
- Processing.
- Partially Dispatched.
- Dispatched.
- Delivered.
- Cancelled.
- Returned.

Features:

- Retailer order creation.
- Admin order creation.
- Product and variant selection.
- Quantity validation.
- Pricing calculation.
- Tax calculation.
- Discount configuration.
- Stock availability validation.
- Order approval.
- Partial fulfillment.
- Shipment tracking.
- Order cancellation.
- Order history.

Use proper inventory reservation and release logic.

Do not mark an order delivered until delivery confirmation is recorded.

---

# 11. DELIVERY MANAGEMENT

Build a professional dispatch and delivery module.

Features:

- Delivery assignment.
- Warehouse dispatch.
- Delivery personnel.
- Shipment tracking.
- Delivery photographs.
- Delivery confirmation.
- Retailer acknowledgement.
- Partial delivery.
- Undelivered shipments.
- Return-to-warehouse processing.

Record IMEI/serial information for applicable devices.

Maintain complete shipment audit history.

---

# 12. QUOTATIONS AND INVOICES

Quotations:

- Create quotation.
- Select retailer.
- Add products.
- Apply approved discounts.
- Calculate taxes.
- Set quotation expiry.
- Convert approved quotation into an order.
- Export PDF.

Invoices:

- Unique invoice numbering.
- Configurable tax treatment.
- Line-item details.
- Discounts.
- Payment status.
- Outstanding amount.
- PDF generation.
- Invoice history.

Support applicable Indian GST configuration.

Do not hardcode tax rates. Make tax rules configurable and validate business requirements before production use.

---

# 13. PAYMENT AND DEALER LEDGER

Build a financial management module.

Payment methods:

- UPI.
- Bank Transfer.
- Cash.
- Card.
- Other configured methods.

Features:

- Payment recording.
- Payment allocation.
- Partial payment.
- Outstanding balance.
- Credit limit.
- Due-date tracking.
- Payment receipts.
- Refund tracking.
- Ledger statements.

Implement double-entry accounting principles where the business accounting scope requires them.

Never allow users to silently edit historical financial transactions.

Use reversal and adjustment entries with audit logs.

Do not store payment card credentials.

---

# 14. REPORTS AND BUSINESS INTELLIGENCE

Build an advanced reporting system.

Reports:

- Sales Report.
- Product Performance.
- Brand Performance.
- Retailer Performance.
- Employee Performance.
- Warehouse Stock.
- Inventory Valuation.
- Order Report.
- Delivery Report.
- Payment Report.
- Outstanding Receivables.
- Profitability.
- Tax Summary.
- Returns and Damages.

Features:

- Date filters.
- Advanced filtering.
- Sorting.
- Pagination.
- Excel export.
- CSV export.
- PDF export.
- Print-ready reports.

Use server-side aggregation and permission-aware data access.

---

# 15. BACKEND ARCHITECTURE

Build real backend functionality using the existing stack.

If the current project does not have an established stack, use a modular architecture such as:

Frontend:
- Next.js or existing React framework.
- TypeScript.
- Tailwind CSS.
- Reusable UI components.
- Accessible component library.

Backend:
- Node.js.
- TypeScript.
- Express or an existing compatible backend framework.
- Modular service and controller architecture.

Database:
- MongoDB.
- Mongoose where appropriate.
- Indexed collections.
- Schema validation.
- Transaction support.

API architecture:

/api/v1/auth
/api/v1/users
/api/v1/employees
/api/v1/dashboard
/api/v1/products
/api/v1/categories
/api/v1/brands
/api/v1/inventory
/api/v1/warehouses
/api/v1/retailers
/api/v1/retailer-applications
/api/v1/orders
/api/v1/quotations
/api/v1/deliveries
/api/v1/invoices
/api/v1/payments
/api/v1/ledger
/api/v1/field-visits
/api/v1/reports
/api/v1/notifications
/api/v1/settings
/api/v1/audit-logs

Adapt routes to existing conventions and avoid unnecessary duplication.

Every endpoint must have:
- Request validation.
- Authentication where required.
- Authorization.
- Consistent response structure.
- Appropriate HTTP status codes.
- Safe error handling.
- Logging.
- Pagination where relevant.

---

# 16. MONGODB DATA ARCHITECTURE

Design normalized business relationships using MongoDB references and embedded structures where appropriate.

Suggested collections:

- users
- roles
- permissions
- employees
- products
- productVariants
- brands
- categories
- deviceSerials
- warehouses
- inventory
- stockMovements
- retailers
- retailerApplications
- salesTargets
- fieldVisits
- quotations
- orders
- orderItems
- deliveries
- invoices
- payments
- ledgerEntries
- notifications
- supportTickets
- websiteSettings
- auditLogs

Requirements:

- Appropriate indexes.
- Unique constraints.
- Data validation.
- Referential integrity checks.
- Created and updated timestamps.
- Soft deletion where appropriate.
- Pagination.
- Transaction-safe financial and inventory workflows.
- Database backup strategy.

Reuse existing collections when equivalent models already exist.

Do not expose database credentials.

Do not store large image files directly in normal MongoDB documents. Use secure object storage and persist metadata and file references.

---

# 17. AUTHENTICATION AND RBAC

Implement secure authentication.

Roles:

1. Super Admin.
2. Company Admin.
3. Operations Manager.
4. Warehouse Manager.
5. Sales Manager.
6. Sales Representative.
7. Finance Manager.
8. Accountant.
9. Delivery Personnel.
10. Retailer.

Implement granular permissions:

- Read.
- Create.
- Update.
- Approve.
- Delete.
- Export.
- Financial access.
- Sensitive data access.

Requirements:

- Secure password hashing.
- Secure session management.
- Access token and refresh token strategy where appropriate.
- Password reset.
- OTP verification.
- Session expiry.
- Account lockout protections.
- Login activity.
- Logout.
- Optional MFA.

Do not rely on hiding frontend buttons for security. Enforce permissions on the backend.

---

# 18. SECURITY

Implement:

- Server-side validation.
- Rate limiting.
- Secure HTTP headers.
- CSRF protection where applicable.
- XSS protection.
- Injection prevention.
- Secure file uploads.
- File type and size restrictions.
- Access control.
- Audit logging.
- Secrets management.
- Safe error messages.
- Sensitive data masking.
- Backup and recovery procedures.

Use environment variables for credentials.

Never commit secrets or API keys to Git.

---

# 19. PERFORMANCE AND INFRASTRUCTURE

Optimize:

- Database queries.
- Index usage.
- Server-side pagination.
- API response sizes.
- Image optimization.
- Lazy loading.
- Code splitting.
- Caching where safe.
- Background processing for heavy tasks.
- Logging and monitoring.

Prepare:

- Development configuration.
- Production configuration.
- Environment variable template.
- Database migration or initialization scripts.
- Deployment documentation.
- Backup instructions.
- Health-check endpoint.

Do not assume a particular cloud provider unless the existing project already uses one.

---

# 20. TESTING

Implement:

Unit tests:
- Pricing calculations.
- Tax calculations.
- Stock calculations.
- Order validation.
- Payment allocation.
- Permission checks.

Integration tests:
- Authentication.
- Product APIs.
- Retailer APIs.
- Inventory APIs.
- Order creation.
- Delivery processing.
- Invoice generation.
- Payment recording.

End-to-end tests:

Scenario A:
Admin creates a product and adds inventory.

Scenario B:
Admin registers and approves a retailer.

Scenario C:
Retailer logs in and places an order.

Scenario D:
Warehouse processes the order and dispatches products.

Scenario E:
Delivery employee confirms delivery.

Scenario F:
Finance records a payment and updates the ledger.

Scenario G:
Admin generates a sales report.

Verify that all operations persist correctly in MongoDB.

---

# 21. REAL DATA ONLY

Critical rules:

- No fake business records.
- No invented retailer accounts.
- No fabricated orders.
- No false sales figures.
- No fake warehouse addresses.
- No false brand authorization claims.
- No fake payment records.
- No fabricated customer testimonials.

If the database is empty, display attractive empty states and zero-value KPIs.

If test data is necessary, use an explicitly separated development seed environment. Never seed fictional records into production.

---

# 22. IMPLEMENTATION WORKFLOW

Execute in stages without stopping at visual mockups.

Stage 1: Existing project audit and architecture.
Stage 2: Design system and reusable UI components.
Stage 3: Application layout and navigation.
Stage 4: Dashboard.
Stage 5: Product and brand management.
Stage 6: Inventory and warehouses.
Stage 7: Retailer management.
Stage 8: Sales and field operations.
Stage 9: Orders and quotations.
Stage 10: Delivery management.
Stage 11: Invoices and financial management.
Stage 12: Analytics and reports.
Stage 13: Authentication and permissions.
Stage 14: Security hardening.
Stage 15: Testing and deployment preparation.

Work incrementally.

After every stage:
- Run the application.
- Check for errors.
- Verify API behavior.
- Verify database persistence.
- Check responsive layouts.
- Fix regressions before moving forward.

Do not leave buttons as placeholders.

Do not implement fake API responses as production functionality.

---

# 23. FINAL DELIVERABLES

At completion, provide:

1. Complete working frontend.
2. Complete backend implementation.
3. MongoDB schemas and indexes.
4. API documentation.
5. Authentication and authorization.
6. Business logic.
7. Reusable UI component library.
8. Responsive dashboard.
9. Product and inventory management.
10. Retailer management.
11. Order and delivery workflows.
12. Financial management.
13. Reports and analytics.
14. Automated tests.
15. Environment variable template.
16. Setup instructions.
17. Deployment instructions.
18. Database backup instructions.

Provide a final implementation report listing:
- Files created.
- Files modified.
- APIs implemented.
- Database models implemented.
- Features completed.
- Tests passed.
- Known limitations.
- Remaining configuration requirements.

## FINAL COMMAND

Build the complete APEX Electronics Enterprise Distribution Management Platform.

The quality bar is a premium enterprise SaaS application.

The frontend must be visually exceptional.

The backend must be functional.

The database must persist real business records.

The APIs must be secure.

The business workflows must be logically correct.

The application must be responsive and testable.

Do not stop after designing the dashboard. Implement the complete working system using the existing project's architecture.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-19T18:06:36+05:30.
</ADDITIONAL_METADATA>
