# Chi-White

Chi-White is a Next.js storefront and a Node.js/Express API backed by the existing PostgreSQL database. The collection is organized into plain white shirts, hoodies, and selected designer clothing.

## Run the application

Requirements: Node.js 20.9+ and the existing PostgreSQL database.

1. Install dependencies:

   ```bash
   npm install
   npm run install:all
   ```

2. Keep the private `server/.env` file. For a fresh setup, copy `server/.env.example` to `server/.env` and set the existing database connection values and a random `JWT_SECRET` of at least 32 characters. Do not commit credentials.

3. Review and apply these additive migrations to the existing database, in order:

   - `server/database/migrations/001_catalog_and_cart.sql`
   - `server/database/migrations/002_customer_accounts_and_designer_category.sql`

   Migrations are not run automatically. They add catalog fields and carts, customer accounts, and the designer category; they do not create or replace the database.

4. Start both applications from the repository root:

   ```bash
   npm run dev
   ```

   - Storefront: <http://localhost:3000>
   - API health: <http://localhost:4000/api/health>

The root `dev` script runs the Next.js frontend and Express backend together. To point the frontend at a different API, set `NEXT_PUBLIC_API_URL`; configure `CORS_ORIGIN` in `server/.env` for the frontend origin.

## Design and routes

- Sticky white-and-black header with the supplied Fallen Angel mark, sign-in/account and bag controls, and responsive category filters.
- Category routes: `/catalog/white-shirts`, `/catalog/hoodies`, `/catalog/designer`, and `/catalog`.
- Customer sign-up is rate-limited and creates customer-only accounts; it cannot create staff or manager accounts.
- Manager product tools and the existing sales, returns, checkout, and reporting workflows remain available.
- Card/mobile payments are disabled until a provider verifies payment; checkout does not mark unverified payments as paid.
- The 20% offer is calculated when the cart contains more than three shirts/hoodies; designer clothing is not counted toward its threshold.

## Validation

```bash
npm test
npm run build
```

Keep the historical MySQL scripts under `database/` unused; the running application uses PostgreSQL.
