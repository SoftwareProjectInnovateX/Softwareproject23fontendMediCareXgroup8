# Frontend — Pharmacy & Supply Chain UI

This repository contains the production React frontend for a multi-role pharmacy and supply-chain management platform. The application serves four primary user roles: customers, suppliers, pharmacists, and administrators.

**What’s in this README**
- **Overview**: purpose and audience
- **Quick start**: run, build, and test instructions
- **Project layout**: where to find key code
- **Configuration**: environment variables and API base URL
- **Developer notes**: conventions and useful links

**Overview**

The frontend offers:
- Authentication and role-based access control
- Customer flows: catalog, cart, checkout, orders
- Supplier tools: inventory, purchase orders, invoices
- Pharmacist workflows: prescriptions, dispensing, reporting
- Admin dashboards: analytics, user & product management

**Tech stack**
- **React** 19 + Vite
- **Routing**: react-router-dom
- **Styling**: Tailwind CSS
- **Auth & data**: Firebase (Auth, Firestore, Storage)
- **State**: Zustand
- **Charts**: Recharts
- **HTTP**: axios

**Quick links**
- Package manifest: [package.json](package.json#L1)
- App entry: [src/main.jsx](src/main.jsx#L1)
- Routes: [src/App.jsx](src/App.jsx#L1)
- API base: [src/config/api.js](src/config/api.js#L1)
- Vite config: [vite.config.js](vite.config.js#L1)

**Prerequisites**
- Node.js 18+ (LTS recommended)
- npm or yarn
- Running backend API reachable from `VITE_API_URL_RAILWAY`

**Environment**
Copy `.env.example` (create one if it doesn't exist) and set values in the `frontend` folder. Required variables used by the app include:

```env
VITE_API_URL_RAILWAY= # e.g. https://api.example.com
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Notes:
- The application composes the API base as described in [src/config/api.js](src/config/api.js#L1). Do not include a trailing `/api` in the `VITE_API_URL_RAILWAY` value.

**Install & run**

Install dependencies:

```bash
npm install
```

Run development server (Vite):

```bash
npm run dev
```

Build for production:

```bash
npm run vite-build
```

Preview the production build locally:

```bash
npm run preview
```

Common scripts (from [package.json](package.json#L1)):
- **dev**: `vite` — local development server
- **vite-build**: `vite build` — production build
- **preview**: `vite preview` — serve built assets locally
- **lint**: `eslint .` — project linting

**Project structure (high level)**

Key folders:
- `src/components/` — shared UI components
- `src/pages/` — top-level pages organized by role (`customer`, `supplier`, `pharmacist`, `admin`)
- `src/layouts/` — layout components used by route groups
- `src/context/` — `AuthContext` and `ThemeContext` providers
- `src/services/` — API wrappers and Firebase helpers
- `src/config/` — small configuration modules (API base URL)

Entry & routing:
- See [src/main.jsx](src/main.jsx#L1) for the React entry point and providers.
- See [src/App.jsx](src/App.jsx#L1) for route definitions and `ProtectedRoute` usage.

**Development notes & conventions**
- Routes are grouped by role and wrapped by layout components.
- Keep UI logic inside components and move data fetching into `services/` when possible.
- Shared state belongs in `stores/` (Zustand) or local component state where appropriate.
- Use Tailwind utility classes in JSX; global styles live in `src/index.css`.

**API & Firebase**
- API base URL is built in [src/config/api.js](src/config/api.js#L1). The app expects backend endpoints under the `/api` prefix.
- Firebase is initialized in `src/lib/firebase.js` and used by `src/services/firebase.js`.

**Testing & linting**
- Tests: configured to use `vitest` and some CRA test scripts; see `package.json`.
- Linting: `npm run lint` runs ESLint across the project.

**Deployment hints**
- The app is a standard Vite SPA; host the `dist/` output on static hosting (Netlify, Vercel, Railway static, or serve behind CDN).
- Ensure environment variables are populated in production host settings.

**Troubleshooting**
- 502/Network errors: verify `VITE_API_URL_RAILWAY` and proxy in [vite.config.js](vite.config.js#L1).
- Auth issues: confirm Firebase config env variables and Firestore rules.

**Contributing**
- Follow existing folder conventions. Add tests for new features and run `npm run lint` before PRs.

---

If you want, I can also:
- add a `.env.example` file with the required keys,
- add a short developer checklist to `CONTRIBUTING.md`, or
- open a PR updating CI/deploy steps.

