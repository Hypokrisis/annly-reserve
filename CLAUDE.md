# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:5173 (hot reload)
npm run build      # Production build → dist/
npm run typecheck  # TypeScript check without emit (currently reveals ~30 pre-existing errors — see note below)
npm run lint       # ESLint
npm run preview    # Serve the production build locally
```

No test suite. Verify behavior by running `npm run dev` and testing in browser.

**TypeScript note:** `tsconfig.app.json` has `"ignoreDeprecations": "6.0"` but the installed tsc is 5.6.3 — fixing the value to `"5.0"` unmasks ~30 pre-existing type errors scattered across dashboard pages. The Vite/esbuild build is unaffected either way.

## Architecture

**Stack:** Vite + React 18 + TypeScript + Tailwind CSS 3 + Supabase — deployed on Netlify (production tracks `master`).

**Companion project:** `C:\Users\loann\barberbot` — a separate Express/Node.js WhatsApp bot (Twilio + Groq), deployed on Railway. Both share the same Supabase instance (project ref `cqszqdgoteagffdnecju`). Schema changes affect both.

### Path alias

`@/` → `src/`. Always use it for internal imports.

### Supabase client

One single `createClient` call lives in `src/supabaseClient.ts`. All other files import from there (or `@/lib/supabase`, which re-exports it). **Never call `createClient` a second time anywhere** — duplicate `GoTrueClient` instances race over the same auth token and break login on iOS/Safari. The client uses `auth.lock = processLock` (from `@supabase/supabase-js`) instead of the default `navigator.locks`, which deadlocks on iOS WebKit.

### Context / Provider tree (App.tsx)

```
ToastProvider → ThemeProvider → AuthProvider → BusinessProvider → Router
```

All provider `value` objects are wrapped in `useMemo` keyed on their state — do not remove these or all consumers will re-render on every provider state change (causes main-thread freezes on mobile).

- **AuthContext** — Supabase session, `user`, `currentBusiness` (Business object), `role` (`owner | admin | staff`), `authError`, `retryBootstrap`. The bootstrap wraps Supabase calls in a 12s `withTimeout` so slow networks show a retry UI instead of hanging. Call `useAuth()`.
- **BusinessContext** — active `business`, `barbers[]`, `services[]`, `subscription` (with `subscription_tiers`), `monthlyAppointmentsCount`. Loaded reactively from `currentBusiness`. Dashboard pages should consume this instead of fetching separately.
- **ThemeContext** — `theme` (`light | dark`), `toggleTheme`. Dark mode uses the `class` strategy on `<html>`.
- **ToastContext** — `toast.success()`, `toast.error()`, `toast.info()`.

### Route guards

`App.tsx` uses lazy-loaded pages (`React.lazy` + `<Suspense>`) with these guard wrappers:
- `OwnerRoute` — owner/admin only; redirects to `/login`, `/staff`, `/client`, or `/create-business` depending on state
- `StaffRoute` — barber/owner/admin; redirects unauthenticated to `/login`, clients to `/client`
- `ClientRoute` — any authenticated user
- `AuthOnlyRoute` — authenticated only, no role or business required

All guards use `AuthStatusScreen` for the loading/error state (spinner → "Reintentar" button on timeout). Never render a blank screen.

### Layout rule

Every dashboard page **must** be wrapped in `<DashboardLayout>`. It renders the sidebar and mobile nav. `SidebarContent` is rendered as an inline call `{SidebarContent()}` — not `<SidebarContent />` — so React does not treat it as a separate component and remount it on every render.

### Design system — dark mode rule

All colors must use CSS variables via Tailwind semantic classes (`bg-space-card`, `text-space-text`, `text-space-muted`, `border-space-border`, `bg-space-card2`, etc.). **Never use** `bg-white`, `text-gray-*`, `bg-indigo-*` — they break dark mode.

Key CSS classes in `src/index.css`:

| Class | Purpose |
|---|---|
| `.card` / `.card-hover` / `.dash-card` | Card containers |
| `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` | Buttons |
| `.input-field` / `.input-label` | Form inputs |
| `.badge-green/red/amber/gray` | Status badges |
| `.nav-item` / `.nav-item.active` | Sidebar links |
| `.glass-effect` | Frosted glass surface |

**Mobile performance rule:** `src/index.css` has a `@media (max-width: 768px)` block that disables `backdrop-filter`, `filter: blur()`, and infinite decorative animations (`float`, `gradient`, `pulse`). These are expensive to rasterize on iOS Safari. Do not add new `blur-*` or `backdrop-blur-*` elements to mobile-visible surfaces without considering this.

### Component definition rule (critical for mobile perf)

**Never define a component inside another component's render function.** Doing so gives it a new identity on every render, causing React to unmount and remount the entire subtree — which produces multi-second main-thread freezes on mobile. Always define subcomponents at module level and pass state as props.

### Supabase schema (tables used)

| Table | Key fields / notes |
|---|---|
| `businesses` | `plan_status` (`basic/pro/premium`), `whatsapp_bot_active`, `whatsapp_booking_link`, `whatsapp_offer`, `slug` |
| `barbers` | Active barbers per business; linked to services via `barbers_services` junction |
| `services` | `price`, `duration_minutes`, `is_active`, `display_order` |
| `schedules` | Work hours by `day_of_week` (0=Sun). **UNIQUE on `(barber_id, day_of_week)`** — use `upsert` with `onConflict: 'barber_id,day_of_week'`, never raw insert |
| `appointments` | `client_id` = null → guest; non-null → registered user. **`end_time` is required** — omitting it causes `parseTime(null)` crashes in availability logic. Cancelling an appointment **deletes** the row (not just status update) — the `send-twilio` edge function handles this by falling back to `notification_jobs.payload` |
| `profiles` | `id` matches Supabase auth UID, `full_name`, `phone` |
| `notification_jobs` | Enqueued by DB trigger on appointment INSERT/UPDATE. Processed by `send-twilio` edge function (pg_cron every minute). Payload captures all message data at enqueue time so the job works even if the appointment row is deleted later |

### Availability calculation

`src/services/availability.service.ts` — `calculateAvailability()` fetches barber schedules and existing appointments, generates 15-min slots, filters conflicts.
- Uses `.maybeSingle()` on schedules (not `.single()`) — duplicate rows crash `.single()`
- `end_time` must be present on all appointments for conflict detection to work

### Guest vs. Registered clients

`appointments.client_id` null = guest (bot or web without login). Non-null = Supabase auth user. The barberbot links by phone via `profiles`. `AppointmentsPage` shows "Invitado" / "Registrado" badges using `getClientBadge(appointment)`.

### Services layer pattern

Service functions in `src/services/` call Supabase directly. Hooks in `src/hooks/` wrap services with React state. Pages call hooks or services — not Supabase directly in most cases. Exception: dashboard pages sometimes query Supabase directly for page-specific analytics.

### Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Deployment

Netlify auto-deploys `master` — `git push origin master` is the full deploy. Config in `netlify.toml`: publishes `dist/`, SPA redirect, and immutable cache headers for `/assets/*`. The repo also has a Vercel integration but it only builds previews (`production_environment: false`) and is not used.
