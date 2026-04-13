import React from 'react';

const PaymentMethod = ({ selectedMethod, setMethod }) => {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-blue-900 mb-6">Select Payment Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => setMethod('ONLINE')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedMethod === 'ONLINE' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                    <span className="font-bold uppercase">Online Payment</span>
                    <span className="text-xs">Visa / Master / Koko</span>
                </button>
                <button 
                    onClick={() => setMethod('COD')}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedMethod === 'COD' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                    <span className="font-bold uppercase">Cash on Delivery</span>
                    <span className="text-xs">Pay when you receive</span>
                </button>
            </div>
        </div>
    );
};

export default PaymentMethod;