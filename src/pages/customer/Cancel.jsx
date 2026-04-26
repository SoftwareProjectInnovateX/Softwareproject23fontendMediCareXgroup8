import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { XCircle, AlertCircle } from 'lucide-react';

const UI_CONFIG = {
    ICON_SIZE: 80,
    CHECKOUT_BASE_PATH: "/customer/checkout"
};

const ERROR_MESSAGES = {
    PAYMENT_FAILED_TITLE: "Payment Unsuccessful",
    PAYMENT_FAILED_BODY: "We couldn't process your payment. This could be due to incorrect card details or a bank refusal. Please try again."
};

const Cancel = () => {
    const location = useLocation();
    const { rxId, rxAmount } = location.state || {};

    // Construct the return URL with original parameters if it was a prescription
    const returnUrl = rxId 
        ? `${UI_CONFIG.CHECKOUT_BASE_PATH}?rxId=${rxId}&amount=${rxAmount}`
        : UI_CONFIG.CHECKOUT_BASE_PATH;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <main className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl text-center animate-in zoom-in duration-500">
                <div className="flex justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-red-100 rounded-full scale-150 blur-xl opacity-20"></div>
                    <XCircle 
                        size={UI_CONFIG.ICON_SIZE} 
                        className="text-red-500 relative z-10" 
                    />
                </div>

                <header>
                    <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                        {ERROR_MESSAGES.PAYMENT_FAILED_TITLE}
                    </h1>
                </header>

                <div className="bg-red-50 p-4 rounded-2xl mb-8 flex gap-3 text-left">
                    <AlertCircle className="text-red-600 shrink-0" size={20} />
                    <p className="text-red-800 text-sm leading-relaxed">
                        {ERROR_MESSAGES.PAYMENT_FAILED_BODY}
                    </p>
                </div>

                <Link 
                    to={returnUrl} 
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                    Try Again
                </Link>

                <Link 
                    to="/customer" 
                    className="block mt-4 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                >
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default Cancel;