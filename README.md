# Mobile Library Management

A small web app for running a children's mobile library: registering members,
borrowing and returning books, and admin tools for managing the book
catalogue and team. Built for occasional use by 1-3 volunteers at a time —
there is no expectation of meaningful concurrent traffic.

## Stack

- React + TypeScript + Tailwind CSS (Vite), deployed as a static site
- Supabase (Postgres + Auth) for data, with a couple of database functions
  (RPCs) for the borrow/return transactions
- Real staff logins (email + password) via Supabase Auth — see **Security
  model** below

## Security model (read this before deploying)

This system is designed for in-person use by a small, trusted team, not for
public/internet-scale traffic — but it holds children's names, ages,
schools, and guardians' contact details, so access to that data is locked
behind real authentication:

- **Staff (volunteers/admins) have real passwords**, via Supabase Auth
  (`email` + `password`, handled entirely by Supabase — this app never
  stores or hashes a password itself). See `src/lib/auth.ts`.
- **Members (children) never authenticate.** They don't have accounts,
  passwords, or logins of any kind — a signed-in volunteer looks them up by
  username on their behalf. This is unchanged and intentional.
- **Row Level Security (RLS) is enabled on every table**, with a single
  policy: only a signed-in (`authenticated`) session can read or write
  anything. The public `anon` key — visible to anyone who opens dev tools on
  the live site — grants **zero** access to any table on its own. See
  `supabase/migrations/0006_rls_lockdown.sql`.
- **Practical implication:** even someone who finds your Supabase URL and
  anon key (e.g. an automated scanner that scrapes public GitHub repos for
  exposed API keys — this repo is public) cannot read or write any data
  without a valid staff login. This is a meaningful improvement over "no
  RLS," though it doesn't defend against someone who reads this repo's
  source, creates their own Supabase Auth session some other way, and is
  specifically targeting this project — that level of protection would
  require moving all data access behind server-side edge functions instead
  of direct client queries, which this app does not do.

## Project structure

```
src/
  components/        Screens for the borrow/return/register/home flows
  components/admin/  Admin dashboard, books/members tables, audit log
  lib/               Supabase client, auth (Supabase Auth), username
                     generator, email sending
  types/             Shared TypeScript types
  router.ts          Lightweight in-app view-state router (no URL routing —
                     this avoids the GitHub Pages SPA-routing workaround
                     entirely, which is fine for an internal single-purpose tool)
supabase/
  migrations/        SQL schema, seed admin, borrow/return RPC functions, RLS
  functions/         send-email (browser-triggered emails), check-overdue
                     (daily due-soon/overdue email sweep), create-staff-account
                     (registers a new admin/volunteer without disturbing the
                     registering admin's own session), _shared/resend.ts
                     (shared Resend API wrapper used by send-email/check-overdue)
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

In the Supabase dashboard's **SQL Editor**, run the files in
`supabase/migrations/` **in order**:

1. `0001_init.sql` — creates all tables
2. `0002_seed_admin.sql` — seeds the first administrator account
   (username `omotara00`)
3. `0003_borrow_return_rpc.sql` — creates the `borrow_book` / `return_book`
   database functions
4. `0004_due_soon_reminder.sql` — adds the flag used by the day-before-due
   reminder email
5. `0005_restore_book_audit_action.sql` — allows logging when a lost/damaged
   book is restored back to available
6. `0006_rls_lockdown.sql` — enables Row Level Security on every table and
   adds the `admins.auth_user_id` column linking a staff row to a real
   Supabase Auth login (see step 3 below)

(If you have the Supabase CLI installed and linked to your project, you can
instead run `supabase db push`.)

### 3. Set up your own staff login (Supabase Auth)

1. **Authentication → Providers**: confirm "Email" is enabled (it is by
   default).
2. **Authentication → Settings**: turn **off** "Confirm email". Otherwise
   every new admin/volunteer must click an email confirmation link before
   their first login — extra friction this app doesn't need, and it'd
   depend on your Resend setup (step 4) working.
3. **Authentication → Users → Add user**: create your own account with a
   real email and password. Copy the generated **User UID**.
4. Back in the **SQL Editor**, link that new login to the `omotara00` seed
   admin row:
   ```sql
   update admins
   set auth_user_id = 'paste-your-user-uid-here'
   where username_lower = 'omotara00';
   ```
5. Deploy the `create-staff-account` edge function (used whenever an admin
   registers a new volunteer/admin from within the app):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase functions deploy create-staff-account
   ```

From now on, log in at `/` → **Admin** with that email + password. Every
new admin/volunteer created afterward (via **Admin → Register new admin**)
sets their own password at registration time — nobody's password is ever
handled directly by this app's own code, Supabase Auth does that.

### 4. Set up Resend and deploy the remaining edge functions

Emails are sent via [Resend](https://resend.com)'s free tier (100/day,
3,000/month), which requires verifying a domain you own:

1. Sign up at resend.com, then **Domains → Add Domain**, and add the DNS
   records it gives you (at your domain registrar). Verification can take a
   few minutes to a few hours.
2. Once verified, set two secrets on your Supabase project (from your
   terminal, with the Supabase CLI installed and linked — see below):
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key
   supabase secrets set RESEND_FROM_EMAIL="Mobile Library <library@yourdomain.com>"
   ```
   The address in `RESEND_FROM_EMAIL` must be `@` your verified domain.
3. Deploy both edge functions:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase functions deploy send-email
   supabase functions deploy check-overdue
   ```

`send-email` needs no other secrets. `check-overdue` also needs
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, which Supabase provides to
edge functions automatically.

If you skip this step, emails will fail silently (logged to the function's
console via Supabase's dashboard **Logs** page) but nothing else in the app
breaks — borrowing, returning, and registration all still work.

### 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 6. Run locally

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

Sent via Resend (see setup step 4 above). Two paths, both going through the
same `supabase/functions/_shared/resend.ts` wrapper:

- **Browser-triggered** (registration welcome, borrow confirmation, return
  confirmation, new-admin welcome) — `src/lib/email.ts` calls the
  `send-email` edge function. A failed send is logged to the browser
  console but never blocks the flow, since the underlying database action
  has already succeeded by the time the email goes out.
- **Scheduled** (due-tomorrow reminder, 1-day-overdue, 7-day-overdue) — sent
  directly from the `check-overdue` edge function on its daily run.

If `RESEND_API_KEY`/`RESEND_FROM_EMAIL` aren't set, sends fail with a clear
error visible in Supabase's **Edge Functions → Logs**, but this never
breaks borrowing, returning, or registration in the app itself.

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
