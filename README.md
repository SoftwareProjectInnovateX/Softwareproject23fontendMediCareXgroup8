# Frontend Application

This project is the React-based frontend for a multi-role pharmacy and supply-chain management platform. It provides dedicated experiences for customers, suppliers, admins, and pharmacists.

## Overview

The frontend includes:
- Authentication and role-based access
- Product browsing, cart, checkout, and order tracking
- Supplier dashboards for inventory and payments
- Admin analytics and user management
- Pharmacist workflows for prescriptions, dispensing, and reporting

## Tech Stack

- React 19
- Vite
- React Router DOM
- Tailwind CSS
- Firebase Authentication, Firestore, and Storage
- Recharts for dashboard analytics
- Zustand for global state management
- ESLint for code quality

## Project Structure

```text
src/
├── components/      # Reusable UI components
├── config/          # App configuration (API base URL)
├── context/         # Auth and theme context providers
├── hooks/           # Custom hooks
├── layouts/         # Route layout wrappers
├── pages/           # Page-level screens by role
├── services/        # API and Firebase service helpers
├── stores/          # Global state stores
└── assets/          # Static resources
```

## Prerequisites

Before running the app, make sure you have:
- Node.js (18 or higher)
- npm or yarn
- A running backend API
- The required environment variables configured

## Environment Setup

Create or update a `.env` file in the `frontend` folder with the following variables:

```env
VITE_API_URL_RAILWAY=https://backendg08innovatex-production.up.railway.app/
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

> The frontend uses `VITE_API_URL` to connect to the backend API and Firebase config values to initialize authentication and storage services.

## Installation

```bash
npm install
```

## Available Scripts

```bash
npm run dev        # start development server
npm run build      # production build
npm run vite-build # Vite production build
npm run preview    # preview production build locally
npm run test       # run tests
npm run lint       # run ESLint
```

## Development Notes

- The main app entry is defined in `src/main.jsx`
- Route handling is configured in `src/App.jsx`
- Most API calls are handled through the services and config folders
- Tailwind styles are enabled via the global stylesheet in `src/index.css`

## Running the App

1. Start the backend server
2. Set up your `.env` values
3. Run:

```bash
npm run dev
```

4. Open the local development URL shown by Vite (typically `http://localhost:5173`)

## Notes for Contributors

- Keep components reusable and role-specific logic separated
- Follow the existing folder structure for pages and features
- Prefer environment-based configuration for API and Firebase settings
- Ensure any new routes are added consistently with role-based access patterns

