# Northstar Corporate Banking

A Node.js corporate banking dashboard prototype for **Srijal Example Pvt Ltd**. The interface represents an organization's bank account workspace, including operating account balances, cash flow, approvals, payments, account activity, beneficiaries, reports, notifications, and team access.

This prototype is inspired by the workflow style of corporate banking platforms such as BizNex and CorporatePay in Nepal. Branding and sample content are original.

## Sample organization

- **Organization:** Srijal Example Pvt Ltd
- **Account number:** 2323345554322
- **Account type:** Organization operating account
- **Currency:** NPR

## Demo logins

Use any of these credentials for the local prototype:

| Role | Username | Password | Access |
| --- | --- | --- | --- |
| Administrator | `admin@srijalexample.com` | `Srijal@123` | Manage users, submit payments, approve payments |
| Initiator | `initiator@srijalexample.com` | `Initiator@123` | Create payment requests and view their status |
| Approver | `approver@srijalexample.com` | `Approver@123` | Review and approve payment requests |

> These are sample credentials for demonstration only. They are not connected to a real bank account and must not be used in production.

## Tech stack

- Node.js
- React
- TypeScript
- Vite
- Express API
- SQLite with `better-sqlite3`
- JWT bearer authentication
- Helmet security headers and Zod request validation
- Lucide React icons

## Run locally

Install dependencies:

```bash
npm install
```

Start the API and frontend together:

```bash
npm run dev:all
```

Open `http://127.0.0.1:5173/`. The API runs at `http://127.0.0.1:3001/`.

To run them separately:

```bash
npm run api
npm run dev
```

## Available scripts

- `npm run dev` starts the Vite development server.
- `npm run api` starts the Express API and creates the local SQLite database.
- `npm run dev:all` starts the API and frontend together.
- `npm run build` type-checks and creates a production build.
- `npm run preview` previews the production build locally.

## Current scope

The current version is a complete local demo with seeded and persisted banking data. The working flow includes:

- Login with the sample organization credentials.
- Administrator user management for creating Initiator and Approver users.
- Role-aware access boundaries for Administrator, Initiator, and Approver users.
- Organization dashboard with account balance and cash-flow summary.
- Separate Payments, Accounts, Collections, and Cards workspaces.
- Payment request form with required beneficiary, amount, and purpose fields.
- Approval queue where pending payments can be approved and the count updates.
- Workspace search across payments, users, and transactions.
- CSV account statement download from the Reports action.
- Working notifications, settings, help, and profile panels.
- Sign out and switch between demo roles.
- Responsive navigation, account activity, quick actions, and demo feedback messages.

It does not connect to a live bank or payment gateway. A production implementation would require hardened authentication, role-based permissions, encrypted data handling, payment-provider integration, monitoring, and production database operations.

## Database

The local API persists system data in `data/corporate-banking.db`. The database includes tables for:

- Organizations and operating accounts
- Users, roles, and account status
- Payment requests and approval history
- Transactions and cards
- Notifications
- Audit logs for login, user creation, payment creation, and approvals

The API seeds the Srijal organization and demo users automatically on first start. The database file is local demo data and should not be committed or used for production banking data.

## Production-shaped configuration

Copy `.env.example` to `.env` and replace `JWT_SECRET` with a long random secret before running outside local development. Set `CLIENT_ORIGIN` to the deployed frontend origin and `VITE_API_URL` to the deployed API URL. The API validates signed bearer tokens and validates user and payment payloads before writing to SQLite.
