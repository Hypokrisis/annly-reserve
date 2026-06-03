# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:5173 (hot reload)
npm run build      # Production build → dist/
npm run typecheck  # TypeScript check without emit
npm run lint       # ESLint
npm run preview    # Serve the production build locally
```

No test suite. Verify behavior by running `npm run dev` and testing in browser.

## Architecture

**Stack:** Vite + React 18 + TypeScript + Tailwind CSS 3 + Supabase — deployed on Netlify.

**Companion project:** `C:\Users\loann\barberbot` — a separate Express/Node.js WhatsApp bot (Twilio + Groq), deployed on Railway. Both share the same Supabase instance (project ref `cqszqdgoteagffdnecju`). Changes to schema affect both.

### Path alias

`@/` → `src/`. Always use it for internal imports.

### Context / Provider tree (App.tsx)

```
ToastProvider → ThemeProvider → AuthProvider → BusinessProvider → Router
```

- **AuthContext** — Supabase session, `user`, `currentBusiness` (Business object), `role` (`owner | admin | staff`). Call `useAuth()` to access.
- **BusinessContext** — active `business`, `barbers[]`, `services[]`, `subscription` (with `subscription_tiers`), `monthlyAppointmentsCount`. Loaded reactively from `currentBusiness`. Dashboard pages should consume this instead of fetching separately.
- **ThemeContext** — `theme` (`light | dark`), `toggleTheme`. Dark mode uses the `class` strategy on `<html>`.
- **ToastContext** — `toast.success()`, `toast.error()`, `toast.info()`.

### Route guards

Routes are composed by stacking guard components:
- `AuthGuard` — redirects to `/login` if no session
- `RequireBusiness` — redirects to `/create-business` if no business
- `RequireOwner` — owner-only pages
- `RequireRole` — accepts `requiredRole: string[]` prop

### Layout rule

Every dashboard page **must** be wrapped in `<DashboardLayout>`. It renders the sidebar and mobile nav — pages rendered outside it will have no navigation.

### Design system — dark mode rule

All colors must use CSS variables via Tailwind semantic classes (`bg-space-card`, `text-space-text`, `text-space-muted`, `border-space-border`, `bg-space-card2`, etc.). **Never use** `bg-white`, `text-gray-*`, `bg-indigo-*` — they break dark mode.

Key CSS classes in `src/index.css`:

| Class | Purpose |
|---|---|
| `.card` / `.card-hover` / `.dash-card` | Card containers (different radius/shadow) |
| `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost` | Buttons |
| `.input-field` / `.input-label` | Form inputs |
| `.badge-green/red/amber/gray` | Status badges |
| `.nav-item` / `.nav-item.active` | Sidebar links |
| `.text-gradient` / `.dot-pattern` / `.glass-effect` | Decorative |

### Supabase schema (tables used)

| Table | Key fields / notes |
|---|---|
| `businesses` | `plan_status` (`basic/pro/premium`), `whatsapp_bot_active`, `whatsapp_booking_link`, `whatsapp_offer`, `whatsapp_marketing_active`, `reminder_inactive_days`, `slug` |
| `barbers` | Active barbers per business; linked to services via `barbers_services` junction |
| `services` | `price`, `duration_minutes`, `is_active`, `display_order` |
| `schedules` | Work hours by `day_of_week` (0=Sun). **UNIQUE constraint on `(barber_id, day_of_week)`** — use `upsert` with `onConflict: 'barber_id,day_of_week'`, never raw insert |
| `appointments` | `client_id`/`customer_user_id` = null → guest; non-null → registered user. **`end_time` is required** — omitting it causes `parseTime(null)` crashes in availability logic |
| `profiles` | `id` matches Supabase auth UID, `full_name`, `phone` |

### Availability calculation

`src/services/availability.service.ts` — `calculateAvailability()` fetches barber schedules and existing appointments, generates 15-min slots, and filters conflicts. Key invariants:
- Uses `.maybeSingle()` on the schedules query (not `.single()`) — duplicate schedules crash `.single()`
- `end_time` must be present on all appointments for conflict detection to work

### Guest vs. Registered clients

`appointments.client_id` null = guest (bot or web without login). Non-null = Supabase auth user. The barberbot also links by phone number via `profiles`. `AppointmentsPage` shows "Invitado" / "Registrado" badges using `getClientBadge(appointment)`.

### Services layer pattern

Service functions in `src/services/` call Supabase directly. Hooks in `src/hooks/` wrap services with React state. Pages call hooks or services — not Supabase directly in most cases. Exception: dashboard pages sometimes query Supabase directly for page-specific analytics.

### Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Note: `.env.example` uses the wrong key name `VITE_SUPABASE_PUBLIC_KEY` — the actual variable read by `supabaseClient.ts` is `VITE_SUPABASE_ANON_KEY`.

### Deployment

Netlify auto-deploys `master`. Config in `netlify.toml`: publishes `dist/`, adds `/*` → `/index.html` SPA redirect.
