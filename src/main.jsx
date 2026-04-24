import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext'; // ✅ Add this import

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <BrowserRouter>
                <AuthProvider>  {/* ✅ Wrap App with AuthProvider */}
                    <App />
                </AuthProvider>
            </BrowserRouter>
        </StrictMode>
    );
}