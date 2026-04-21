import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Checkout from './pages/customer/Checkout';
import Success from './pages/customer/Success';
import Cancel from './pages/customer/Cancel';

/**
 * Route path constants to ensure consistency across the application.
 * Centralizing routes makes the navigation structure easier to manage.
 */
const ROUTES = {
    HOME: "/",
    CHECKOUT: "/checkout",
    CHECKOUT_SUCCESS: "/checkout/success",
    CHECKOUT_CANCEL: "/checkout/cancel"
};

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Core checkout and payment status routes */}
                <Route path={ROUTES.HOME} element={<Checkout />} />
                <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
                <Route path={ROUTES.CHECKOUT_SUCCESS} element={<Success />} />
                <Route path={ROUTES.CHECKOUT_CANCEL} element={<Cancel />} />
            </Routes>
        </Router>
    );
};

export default App;