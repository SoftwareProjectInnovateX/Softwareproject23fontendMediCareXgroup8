import React from 'react';
import { useCartStore } from '../../stores/cartStore';

const OrderSummary = ({ formData, handleInputChange, handlePlaceOrder, isLoading }) => {
    const { getTotal } = useCartStore();
    const total = getTotal();

    const formattedTotal = `Rs. ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    return (
        <section className="border-2 border-blue-600 rounded-2xl p-8 sticky top-6 bg-white shadow-lg">
            <header>
                <h2 className="text-2xl font-bold text-blue-900 mb-8 italic">Your order</h2>
            </header>
            
            <div className="space-y-4 text-sm font-medium text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-4 text-slate-500 uppercase tracking-wider text-xs font-bold">
                    <span>Product</span>
                    <span>Subtotal</span>
                </div>
                
                <div className="flex justify-between text-blue-900 font-bold border-b border-slate-100 pb-4">
                    <span className="max-w-[220px]">Medicine Order Items × 1</span>
                    <span>{formattedTotal}</span>
                </div>
                
                <div className="flex justify-between border-b border-slate-100 py-4">
                    <span>Subtotal</span>
                    <span className="font-bold">{formattedTotal}</span>
                </div>

                <div className="py-6 border-b border-slate-100">
                    <p className="mb-4 text-blue-900 font-bold uppercase text-xs tracking-widest">
                        Select Payment Method
                    </p>
                    <div className="space-y-3">
                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'ONLINE' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-slate-200'}`}>
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="ONLINE" 
                                checked={formData.paymentMethod === 'ONLINE'} 
                                onChange={handleInputChange} 
                                className="w-5 h-5 accent-blue-600" 
                            />
                            <div>
                                <p className="font-bold text-blue-900">Online Payment</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Visa / Master / Koko / Mintpay</p>
                            </div>
                        </label>

                        <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-slate-200'}`}>
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="COD" 
                                checked={formData.paymentMethod === 'COD'} 
                                onChange={handleInputChange} 
                                className="w-5 h-5 accent-blue-600" 
                            />
                            <div>
                                <p className="font-bold text-blue-900">Cash on Delivery</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Pay when you receive the order</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-between py-6 text-2xl font-black text-blue-900">
                    <span>Total</span>
                    <span>{formattedTotal}</span>
                </div>

                <div className="flex gap-4 py-4 text-xs font-normal text-slate-600 leading-relaxed">
                    <input 
                        type="checkbox" 
                        name="agreeTerms" 
                        checked={formData.agreeTerms} 
                        onChange={handleInputChange} 
                        className="w-5 h-5 accent-blue-600 rounded mt-1 cursor-pointer" 
                    />
                    <span>
                        I have read and agree to the website 
                        <span className="text-blue-600 underline font-bold ml-1 cursor-pointer">terms and conditions *</span>
                    </span>
                </div>

                <button 
                    onClick={handlePlaceOrder} 
                    disabled={isLoading} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-full text-lg shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                        </div>
                    ) : "Place order"}
                </button>
            </div>
        </section>
    );
};

export default OrderSummary;