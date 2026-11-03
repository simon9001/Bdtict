# ICT Budget Tracker – frontend

React dashboard for the ICT Department Budget & Procurement Tracker.
It talks to the BGTtracker API (`../BGTtracker`).

**Stack:** React 19 · Vite · TypeScript · Redux Toolkit / RTK Query · React Router · Tailwind CSS + daisyUI · Recharts · react-hook-form · sonner · sweetalert2 · lucide icons

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173  (the API must be running on :4000)
pnpm build        # type-check + production build into dist/
pnpm lint
```

To point at another API, set `VITE_API_URL` in `.env`; see `.env.example`.

## Folder structure

```
src/
├── apiDomain/ApiDomain.ts     API base URL
├── components/
│   ├── auth/                  ProtectedRoute, AdminRoute, PublicRoute
│   ├── common/                PageHeader, StatCard, StatusBadge, Modal, Pagination, FormField, States...
│   ├── charts/                ChartCard (chart/table toggle), chartTheme, one file per chart
│   ├── procurements/          procurement form, record-step form, process progress
│   ├── budget/                budget line + planned-spend forms
│   ├── contracts/  invoices/  tasks/  admin/   feature forms
├── dashboardDesign/           DashboardLayout, Navbar (financial-year switcher), Sidebar
├── features/
│   ├── api/                   baseApi + one RTK Query file per backend module
│   └── slice/                 AuthSlice (login), FilterSlice (selected financial year)
├── hooks/                     useReferenceData (dropdown data), useUrlFilters (filters in the URL)
├── pages/                     one file per screen; admin pages in pages/admin
├── store/                     Redux store + typed hooks
├── types/Types.ts             types mirroring the API responses
└── utils/                     formatting, permissions, error messages, confirm dialog, form helpers
```

## How it works

- **Login and session.** The JWT and user are saved in localStorage via redux-persist. Every request sends the token automatically (`features/api/baseApi.ts`). A 401 response or an expired token logs the user out.
- **Access control in the UI** mirrors the API:
  - the Administration menu shows only for the Head of ICT
  - edit buttons show only to a record's owner or the Head of ICT
  - viewers see everything read-only

  The API still enforces every rule.
- **One shared cache.** Each feature file adds its endpoints to one `baseApi`. Cache tags therefore work across features: recording a payment also refreshes its invoice, its contract and the dashboard.
- **Responsive layout.** On large screens the sidebar is full width or icons only, using the button in the top bar, and the choice is remembered. Below 1024px it is a slide-in drawer. On narrow screens tables hide secondary columns and repeat the key facts under the title.
- **Financial year.** It's chosen once in the top bar and applies to every page.
- **Filters in the URL.** List filters live in the URL, so dashboard tiles link to filtered lists (for example `/procurements?overdue=true`), and filtered views can be bookmarked.
- **Code splitting.** The chart-heavy pages (Dashboard, Reports) load on demand, so the charting library isn't part of the first download.

## Charts

The chart colors come from a palette that was checked for color-blind safety and contrast against the white cards. The values and checks are in `components/charts/chartTheme.ts`.

- Each series keeps its color everywhere: Budget is blue, Contracted orange, Paid aqua.
- Every chart has a **Chart / Table** toggle, so no value depends on color or on hovering.
- Status colors (red for overdue, orange for over target) always come with a text label.
