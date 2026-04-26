// Base API URL used across all fetch calls.
// Do NOT include a trailing slash or any path segment like /api/admin —
// each consumer appends its own path (e.g. /products, /admin/users).
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export default API_BASE_URL;