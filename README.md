# Mobile Library Management

A small web app for running a children's mobile library: registering members,
borrowing and returning books, and admin tools for managing the book
catalogue and team. Built for occasional use by 1-3 volunteers at a time —
there is no expectation of meaningful concurrent traffic.

## Stack

- React + TypeScript + Tailwind CSS (Vite), deployed as a static site
- Supabase (Postgres) for data, with a couple of database functions (RPCs)
  for the borrow/return transactions
- No authentication provider and no passwords — see **Security model** below

## Security model (read this before deploying)

This system is designed for in-person use by a small, trusted team, not for
public/internet-scale traffic:

- **No passwords.** Staff "log in" by typing their username; the app looks
  it up in the `admins` table and checks `status = 'active'`.
- **No Supabase Auth.** The app uses the Supabase anon key directly from the
  browser and does **not** enable Row Level Security on any table — access
  control (who can see/do what) is enforced entirely in the React app, not
  the database.
- **Practical implication:** anyone who obtains your Supabase URL + anon key
  can read/write the database directly via the REST API, bypassing the app
  entirely. This is an accepted tradeoff for a zero-cost MVP used by 1-3
  known people. If that risk profile ever changes (public deployment, more
  users, more sensitive data), enable RLS and move to real authentication
  before that happens.

## Project structure

```
src/
  components/        Screens for the borrow/return/register/home flows
  components/admin/  Admin dashboard, books/members tables, audit log
  lib/               Supabase client, auth, username generator, email stubs
  types/             Shared TypeScript types
  router.ts          Lightweight in-app view-state router (no URL routing —
                     this avoids the GitHub Pages SPA-routing workaround
                     entirely, which is fine for an internal single-purpose tool)
supabase/
  migrations/        SQL schema, seed admin, borrow/return RPC functions
  functions/         check-overdue edge function (daily overdue email sweep)
.github/workflows/
  deploy.yml          Build + deploy to GitHub Pages on push to main
  check-overdue.yml   Daily cron that invokes the check-overdue edge function
```

## One-time setup

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com). From
**Project Settings → API** you'll need:

- Project URL
- `anon` public key
- `service_role` key (used only by the edge function, never in the browser)

### 2. Run the migrations

In the Supabase dashboard's **SQL Editor**, run the three files in
`supabase/migrations/` **in order**:

1. `0001_init.sql` — creates all tables
2. `0002_seed_admin.sql` — seeds the first administrator account
   (username `omotara00`)
3. `0003_borrow_return_rpc.sql` — creates the `borrow_book` / `return_book`
   database functions

(If you have the Supabase CLI installed and linked to your project, you can
instead run `supabase db push`.)

### 3. Deploy the edge function

```bash
supabase functions deploy check-overdue --project-ref <your-project-ref>
```

This function needs no extra secrets — Supabase automatically provides
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to edge functions at runtime.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 5. Run locally

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages

1. In your GitHub repo, go to **Settings → Pages** and set the source to
   "GitHub Actions".
2. Add two repository secrets (**Settings → Secrets and variables →
   Actions**): `SUPABASE_URL` and `SUPABASE_ANON_KEY` — same values as your
   `.env`. These are used both by the Pages build and by the daily overdue
   check.
3. Push to `main`. The `deploy.yml` workflow builds the app and publishes it
   to `https://<your-username>.github.io/mobile-library-management/`.

`vite.config.ts` sets `base: '/mobile-library-management/'` to match that
URL. If you rename the repo, update this to match.

### Daily overdue check

`.github/workflows/check-overdue.yml` calls the `check-overdue` edge
function once a day via `curl`, using the same two repository secrets. This
is used instead of Supabase's `pg_cron` because it doesn't require enabling
a Postgres extension via the dashboard and costs nothing. You can trigger it
manually any time from the Actions tab ("Run workflow").

## Emails

All emails (borrow/return confirmations, welcome messages, overdue
reminders, admin registration) are currently stubbed to `console.log` in
`src/lib/email.ts` (browser-triggered emails) and inside the
`check-overdue` edge function (overdue reminders). Each call site funnels
through one function, so wiring in a real provider — e.g.
[Resend](https://resend.com)'s free tier (100 emails/day) — is a small,
localized change: replace the body of `sendEmail`/`sendOverdueEmail` with a
`fetch()` call to the provider's API.

## Deferred to a future version

- "Need help choosing a book?" — shows a "Coming soon" placeholder in the
  borrow flow; reserved for a future AI chat feature.
- Barcode/QR scanning, book search for children, member self-service,
  reservations, multi-language support, analytics.

## Admin registration code

New admins/volunteers are registered from the admin dashboard, gated by the
code `9999` (see `src/components/admin/AdminRegistration.tsx`). Change this
if you'd like a different code — it's a simple deterrent for an in-person
tool, not a security boundary.
