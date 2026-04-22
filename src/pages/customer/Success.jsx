import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

// Configuration for UI elements to maintain consistency and ease of updates
const UI_SETTINGS = {
    ICON_SIZE: 80,
    HOME_PATH: "/"
};

const SUCCESS_MESSAGES = {
    TITLE: "Order Successful!",
    BODY: "Your order has been placed successfully. We will send you a confirmation email shortly."
};

const Success = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <main className="max-w-md w-full bg-white p-10 rounded-3xl shadow-lg text-center">
                {/* Visual indicator for successful completion */}
                <div className="flex justify-center mb-6">
                    <CheckCircle 
                        size={UI_SETTINGS.ICON_SIZE} 
                        className="text-green-500" 
                    />
                </div>

                <header>
                    <h1 className="text-3xl font-bold text-blue-900 mb-4">
                        {SUCCESS_MESSAGES.TITLE}
                    </h1>
                </header>

                <p className="text-slate-600 mb-8">
                    {SUCCESS_MESSAGES.BODY}
                </p>

                <Link 
                    to={UI_SETTINGS.HOME_PATH} 
                    className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all"
                >
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default Success;