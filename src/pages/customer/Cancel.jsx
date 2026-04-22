import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const UI_CONFIG = {
    ICON_SIZE: 80,
    CHECKOUT_PATH: "/checkout"
};

const ERROR_MESSAGES = {
    PAYMENT_CANCELLED_TITLE: "Payment Cancelled",
    PAYMENT_CANCELLED_BODY: "Something went wrong or you cancelled the payment. Please try again."
};

const Cancel = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <main className="max-w-md w-full bg-white p-10 rounded-3xl shadow-lg text-center">
                <div className="flex justify-center mb-6">
                    <XCircle 
                        size={UI_CONFIG.ICON_SIZE} 
                        className="text-red-500" 
                    />
                </div>

                <header>
                    <h1 className="text-3xl font-bold text-blue-900 mb-4">
                        {ERROR_MESSAGES.PAYMENT_CANCELLED_TITLE}
                    </h1>
                </header>

                <p className="text-slate-600 mb-8">
                    {ERROR_MESSAGES.PAYMENT_CANCELLED_BODY}
                </p>

                <Link 
                    to={UI_CONFIG.CHECKOUT_PATH} 
                    className="inline-block w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all"
                >
                    Return to Checkout
                </Link>
            </main>
        </div>
    );
};

export default Cancel;