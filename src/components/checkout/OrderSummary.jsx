import React from 'react';

const OrderSummary = ({ subtotal, delivery }) => {
    const total = subtotal + delivery;
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-blue-900 mb-6">Order Summary</h2>
            <div className="space-y-4">
                <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">Rs. {subtotal.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="font-semibold">Rs. {delivery.toLocaleString()}.00</span>
                </div>
                <div className="h-px bg-slate-100 my-4"></div>
                <div className="flex justify-between text-xl font-bold text-blue-900">
                    <span>Total</span>
                    <span>Rs. {total.toLocaleString()}.00</span>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;