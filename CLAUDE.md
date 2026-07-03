# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:5173 (hot reload)
npm run build      # Production build → dist/
npm run typecheck  # TypeScript check without emit (~30 pre-existing errors — see note)
npm run lint       # ESLint
npm run preview    # Serve the production build locally
```

No test suite. Verify behavior by running `npm run dev` and testing in browser.

**TypeScript note:** `tsconfig.app.json` has `"ignoreDeprecations": "6.0"` but the installed tsc is 5.6.3 — fixing the value to `"5.0"` unmasks ~30 pre-existing type errors scattered across dashboard pages. The Vite/esbuild build is unaffected either way.

### Supabase CLI

The project is linked to ref `cqszqdgoteagffdnecju`. The sandbox cannot reach `api.supabase.com` — run these from the user's terminal with the `!` prefix:

```bash
! npx supabase db query --linked --file supabase/migrations/NNN_name.sql  # apply a migration
! npx supabase functions deploy <function-name>                            # deploy edge function
! npx supabase db query --linked "SELECT ..."                              # ad-hoc SQL
```

Migrations in `supabase/migrations/` use sequential names (`005_`, `006_`, ...) — **not** the timestamp format the CLI expects for `db push`. Always apply with `db query --linked --file` instead of `db push`.

## Architecture

**Stack:** Vite + React 18 + TypeScript + Tailwind CSS 3 + Supabase — deployed on Netlify (production tracks `master`, `git push origin master` is the full deploy). Config in `netlify.toml`: publishes `dist/`, SPA redirect, immutable cache headers for `/assets/*`.

**Companion project:** `C:\Users\loann\barberbot` — separate Express/Node.js WhatsApp bot (Twilio + Groq AI), deployed on Railway. Both repos share the same Supabase instance (`cqszqdgoteagffdnecju`). Schema changes affect both.

### Path alias

`@/` → `src/`. Always use it for internal imports.

### Supabase client

One single `createClient` call in `src/supabaseClient.ts`. All files import from there (or `@/lib/supabase`, which re-exports it). **Never call `createClient` a second time** — duplicate `GoTrueClient` instances race over the same auth token and break login on iOS/Safari. Uses `auth.lock = processLock` instead of `navigator.locks` to prevent iOS WebKit deadlocks.

### RLS rule — critical

`appointments` has RLS enabled with **no SELECT policy for `anon` or regular `authenticated` users**. Any direct `.from('appointments').select(...)` from the browser client returns `[]` silently (no error). This has caused two production bugs:

1. `calculateBarberAvailability` saw 0 existing appointments → all slots appeared free
2. The dedup check in `BookingPage` saw 0 existing appointments → allowed duplicate bookings

**Fix pattern:** use `SECURITY DEFINER` RPCs that bypass RLS and return only what's needed (no PII). Existing examples: `get_busy_slots(barber_id, date)`, `has_active_appointment(business_id, phone, email, date)`, `verify_phone_code(code)`. Whenever you need to read `appointments` from public-facing code, check if there's an existing RPC or create one.

### Context / Provider tree (App.tsx)

```
ToastProvider → ThemeProvider → AuthProvider → BusinessProvider → Router
```

All provider `value` objects are wrapped in `useMemo` keyed on their state — do not remove these or all consumers re-render on every change (causes main-thread freezes on mobile).

- **AuthContext** — Supabase session, `user`, `currentBusiness`, `role` (`owner | admin | staff | null`), `authError`, `retryBootstrap`. Bootstrap wraps Supabase calls in 12s `withTimeout`. Call `useAuth()`.
- **BusinessContext** — active `business`, `barbers[]`, `services[]`, `subscription` (with `subscription_tiers`), `monthlyAppointmentsCount`. Dashboard pages consume this instead of fetching separately.
- **ThemeContext** — `theme` (`light | dark`), `toggleTheme`. Dark mode uses the `class` strategy on `<html>`.
- **ToastContext** — `toast.success()`, `toast.error()`, `toast.info()`.

### Route guards

`App.tsx` uses `React.lazy` + `<Suspense>` with these wrappers:
- `OwnerRoute` — owner/admin only; redirects based on role/business state
- `StaffRoute` — barber/owner/admin; redirects unauthenticated to `/login`, clients to `/client`
- `ClientRoute` — any authenticated user
- `AuthOnlyRoute` — authenticated only, no role required

All guards use `AuthStatusScreen` for loading/error (spinner → "Reintentar" on timeout).

### Layout rule

Every **dashboard** page must be wrapped in `<DashboardLayout>`. `SidebarContent` is called as `{SidebarContent()}` — not `<SidebarContent />` — so React doesn't remount it on render.

The **client area** (`/client` → `ClientHome.tsx`) does NOT use DashboardLayout — it has its own fixed nav and is mobile-first.

### Design system — dark mode rule

All colors must use CSS variable tokens via Tailwind semantic classes: `bg-space-bg`, `bg-space-card`, `bg-space-card2`, `text-space-text`, `text-space-muted`, `text-space-primary`, `border-space-border`, `text-space-danger`, `text-space-success`, `text-space-yellow`. **Never use** `bg-white`, `text-gray-*`, `bg-indigo-*` — they break dark mode.

Key CSS utility classes in `src/index.css`:

| Class | Purpose |
|---|---|
| `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` | Buttons |
| `.input-field` / `.input-label` | Form inputs |
| `.badge-green/red/amber/gray` | Status badges |
| `.nav-item` / `.nav-item.active` | Sidebar links |
| `.card` / `.card-hover` / `.dash-card` | Card containers |

**Mobile performance:** `src/index.css` has a `@media (max-width: 768px)` block that disables `backdrop-filter`, `filter: blur()`, and infinite decorative animations. Do not add `blur-*` or `backdrop-blur-*` to mobile-visible surfaces.

### Component definition rule (critical for mobile perf)

**Never define a component inside another component's render function.** It gets a new identity on every render, causing React to unmount and remount the entire subtree — multi-second freezes on mobile. Always define at module level.

### Timezone — Puerto Rico

PR is always UTC-4 (no DST). Two patterns:

**In SQL (Supabase functions / triggers / pg_cron):**
```sql
-- Convert stored local time to timestamptz correctly:
(appointment_date::TEXT || ' ' || start_time::TEXT)::TIMESTAMP AT TIME ZONE 'America/Puerto_Rico'

-- NOT this (treats local time as UTC — 4h off):
(appointment_date::TEXT || 'T' || start_time::TEXT || 'Z')::TIMESTAMPTZ
```

**In JavaScript/TypeScript:**
```ts
const nowPR   = new Date(Date.now() - 4 * 60 * 60 * 1000);
const todayPR = nowPR.toISOString().split('T')[0];          // YYYY-MM-DD
const timePR  = nowPR.toISOString().split('T')[1].slice(0, 5); // HH:MM
```

### Phone normalization

`normalizePhoneE164` in `src/utils/formatters.ts`:
- Strips all non-digits → 10-digit → `+1XXXXXXXXXX` (PR/USA default)
- 11-digit starting with `1` → `+1XXXXXXXXXX`
- Anything else returned as-is

Used everywhere: BookingPage, RegisterClientPage, barberbot, send-verification, send-twilio. Always normalize before comparing or storing.

### Supabase schema (tables used)

| Table | Key fields / notes |
|---|---|
| `businesses` | `plan_status`, `whatsapp_bot_active`, `whatsapp_booking_link`, `slug` |
| `barbers` | Active barbers per business; linked to services via `barbers_services` junction |
| `services` | `price`, `duration_minutes`, `is_active`, `display_order` |
| `schedules` | Work hours by `day_of_week` (0=Sun). **UNIQUE `(barber_id, day_of_week)`** — use `upsert` with `onConflict: 'barber_id,day_of_week'`, never raw insert |
| `appointments` | RLS enabled — see **RLS rule** above. `client_id` null = guest. `end_time` required — omitting it crashes `parseTime(null)` in availability logic. Status flow: `confirmed` → `completed` (auto, pg_cron hourly, 2h after appointment) or `cancelled`. `notification_jobs` trigger fires on INSERT and on `status='cancelled'` (future appointments only) or date/time change. Does NOT fire for `completed`. |
| `profiles` | `id` = auth UID, `full_name`, `phone`, `phone_verified` (bool). `phone_verified=true` means the user confirmed phone via SMS and their WhatsApp appointments are linked. |
| `phone_verifications` | `user_id`, `phone`, `code` (4-digit), `expires_at` (10 min), `used`. Managed by `verify_phone_code(code)` RPC + `send-verification` edge function. |
| `notification_jobs` | Enqueued by `queue_appointment_notification_v2` DB trigger. Processed by `send-twilio` edge function. Payload freezes `appointment_date`/`start_time` at enqueue time — works even if the row changes later. |
| `whatsapp_settings` | `is_active` per business — notifications skip if false |

### SECURITY DEFINER RPCs (bypass RLS)

| Function | Args | Returns | Purpose |
|---|---|---|---|
| `get_busy_slots` | `barber_id UUID, date DATE` | `TABLE(start_time, end_time)` | Availability calc — no PII |
| `has_active_appointment` | `business_id, phone, email, date` | `BOOLEAN` | Dedup before booking — no PII |
| `verify_phone_code` | `code TEXT` | `JSONB {success, phone}` | Verifies SMS code, marks phone_verified, links appointments |
| `cancel_appointment_by_token` | `token TEXT` | `JSONB {success}` | Guest cancel via email link |
| `expire_past_appointments` | — | `void` | Marks confirmed+past appointments as completed (pg_cron, hourly) |

All are `GRANT EXECUTE ... TO anon, authenticated` — callable from the browser client.

### Edge functions (`supabase/functions/`)

| Function | Trigger | Purpose |
|---|---|---|
| `send-twilio` | pg_cron (every 1 min via cron) | Processes `notification_jobs` queue — sends WhatsApp templates via Twilio |
| `send-verification` | Client fetch (authenticated JWT) | Generates 4-digit SMS code, saves to `phone_verifications`, sends via Twilio SMS |
| `send-reminders` | pg_cron / manual | Marketing campaigns and appointment reminders |

`send-verification` requires the auth JWT in `Authorization: Bearer <token>` — deployed **with** JWT verification (no `--no-verify-jwt`). Others use `--no-verify-jwt`.

### Availability calculation

`src/services/availability.service.ts` — `calculateAvailability()` and `isSlotAvailable()` both call `supabase.rpc('get_busy_slots', { p_barber_id, p_date })` instead of querying `appointments` directly (RLS fix). Returns only `{start_time, end_time}`.

### Guest vs. Registered clients

`appointments.client_id = null` → guest (bot or web without login). Non-null = Supabase auth user. Calling `verify_phone_code` links all existing guest appointments with that phone to the user's `client_id`. `getCustomerAppointments` in `src/services/appointments.service.ts` queries by `customer_email.ilike OR client_id.eq` — and filters `appointment_date >= todayPR` to exclude past appointments.

### Active appointment definition (used everywhere)

A "cita activa" = `status = 'confirmed'` AND `appointment_date + start_time` is in the future (PR time). Filters at the right level:
- **DB level:** `gte('appointment_date', todayPR)` on the date field (fast, index)
- **JS level (same-day):** compare full datetime `new Date(y, m-1, d, hh, mm) >= Date.now()`
- **Bot (barberbot):** `nowTimePR()` helper (HH:MM) for same-day time comparison

### Services layer pattern

`src/services/` → Supabase calls. `src/hooks/` → wrap services with React state. Pages call hooks or services, not raw Supabase in most cases. Exception: dashboard pages sometimes query Supabase directly for page-specific analytics.

### Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase edge functions use secrets set via `supabase secrets set`. Key secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_SMS_NUMBER`, `TWILIO_TEMPLATE_CONFIRMED`, `TWILIO_TEMPLATE_CANCELLED`, `TWILIO_TEMPLATE_RESCHEDULED`.
