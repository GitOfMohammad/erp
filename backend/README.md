# ERP Backend

Express and Sequelize backend service.

## Local development

1. Create the MySQL database configured by DB_NAME in .env.
2. Keep .env local; use .env.example as the variable reference.
3. Run npm run dev from this directory.
4. Check http://localhost:3000/health.

The server checks the database connection before listening. Business modules live under `modules/`; domain flows and accounting rules are documented below.

## Production, fixed assets, projects, and shipments

- Production orders issue direct materials to work in progress on release. Manual labor and overhead can be entered on a released order at `POST /api/v1/production/orders/:id/costs` using `cost_type` (`LABOR` or `OVERHEAD`), `cost_date`, `description`, and a Rial `amount`. Each entry debits work in progress (1300) and credits accounts payable (2000); completion transfers total accumulated costs to finished inventory and scrap expense.
- Registering a fixed asset posts its acquisition cost as Dr fixed assets (1600) / Cr accounts payable (2000). `POST /api/v1/financial/assets/register/:id/dispose` scraps the asset at zero proceeds, clears accumulated depreciation (1500), removes gross cost (1600), and recognizes remaining carrying value as loss (5600).
- Project expenses require an active postable expense account. Approval checks the project budget and posts Dr the selected expense account / Cr accounts payable (2000).
- Approved commercial invoices remain responsible for their inventory effects. Invoice-linked shipments are informational and cannot change inventory again. An internal shipment without a commercial document requires source and destination warehouses; delivery transfers quantity and weighted-average cost between them and records paired stock movements.
- Apply the new migration with `npm run db:migrate`, then refresh permissions using `npm run db:seed:permissions` before using the new endpoints. These commands were not run as part of the code change.

- General payables created by fixed-asset acquisitions, approved project expenses, and production labor/overhead can be listed and settled in full or in part from a cash/bank account through `/api/v1/financial/payables`. Each payment posts Dr payables (2000) / Cr treasury; reversals create a compensating entry and restore the open balance.

## Production configuration

- Use .env.production.example as a variable reference and create .env directly on the production host. Replace all placeholders and keep .env out of source control.
- Generate independent JWT secrets on the host with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))". Run it twice and use a different value for each key.
- Set CORS_ORIGIN to the frontend's exact HTTPS origin. The server refuses production startup with wildcard CORS, a local/root database account, an empty database password, short/reused JWT keys, or an invalid bcrypt cost.
- Use a dedicated MySQL account with only the permissions the application needs. Keep MySQL private to the application network and terminate HTTPS at the production proxy.
- Back up the database before applying migrations. Run npm run db:migrate and npm run db:seed:permissions explicitly during deployment; the server does not modify the schema at startup.