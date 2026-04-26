import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCartStore } from '../../stores/cartStore';
import { X, FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

const OrderSummary = ({ formData, handleInputChange, handlePlaceOrder, isLoading, prescriptionTotal, prescriptionItems, cartItems }) => {
    const { getTotal } = useCartStore();
    const [showTerms, setShowTerms] = useState(false);
    
    // Determine which items to display and calculate subtotal
    let itemsToDisplay = [];
    let subtotal = 0;

    if (prescriptionTotal !== null) {
        subtotal = prescriptionTotal;
        if (prescriptionItems) {
            try {
                // Try parsing JSON list from PrescriptionPage
                const parsed = JSON.parse(prescriptionItems);
                itemsToDisplay = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                // Fallback for simple string format
                itemsToDisplay = [{ name: prescriptionItems, qty: 1, price: prescriptionTotal }];
            }
        }
    } else {
        itemsToDisplay = cartItems || [];
        subtotal = getTotal();
    }

    const shippingCharge = 400;
    const total = subtotal + shippingCharge;

    const formatPrice = (price) => `Rs. ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
                
                {/* Itemized List */}
                <div className="space-y-5 border-b border-slate-100 pb-6">
                    {itemsToDisplay.length > 0 ? (
                        itemsToDisplay.map((item, idx) => {
                            const qty = item.qty || item.quantity || 1;
                            const price = item.price || (item.total / qty) || 0;
                            const itemTotal = (price * qty) || item.total || 0;

                            return (
                                <div key={idx} className="flex justify-between items-start gap-4 animate-in fade-in slide-in-from-right-4" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-blue-900 font-bold text-[15px] leading-tight">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">QTY: {qty}</span>
                                            <span className="text-[11px] text-slate-400 font-medium">× {formatPrice(price)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-blue-900 font-black text-base">{formatPrice(itemTotal)}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex justify-between items-center py-2 text-blue-900 font-bold bg-blue-50/50 px-4 rounded-xl border border-blue-100/50">
                            <span>Medicine Order Items</span>
                            <span className="text-lg">{formatPrice(subtotal)}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between border-b border-slate-100 py-4">
                    <span>Subtotal</span>
                    <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 py-4 text-emerald-600">
                    <span className="flex items-center gap-2">
                        Shipping Charge
                        <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase">Flat Rate</span>
                    </span>
                    <span className="font-bold">{formatPrice(shippingCharge)}</span>
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
                    <span>{formatPrice(total)}</span>
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
                        <span 
                            onClick={() => setShowTerms(true)}
                            className="text-blue-600 underline font-bold ml-1 cursor-pointer hover:text-blue-800 transition-colors"
                        >
                            terms and conditions *
                        </span>
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
            {/* Terms and Conditions Modal */}
            {showTerms && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
                        <header className="bg-blue-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Terms & Conditions</h3>
                                    <p className="text-xs text-blue-100 font-bold uppercase tracking-widest opacity-80">MediCareX Pharmacy Service</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowTerms(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 relative z-10"
                            >
                                <X size={24} />
                            </button>
                        </header>

                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8 bg-white">
                            <section className="space-y-4">
                                <h4 className="flex items-center gap-3 font-black text-blue-900 text-sm uppercase tracking-widest">
                                    <span className="p-1.5 bg-emerald-100 rounded-lg"><CheckCircle2 size={16} className="text-emerald-600" /></span>
                                    Order Confirmation
                                </h4>
                                <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                                    By placing an order, you agree that all information provided is accurate. Prescription orders will only be processed after verification by our qualified pharmacists.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h4 className="flex items-center gap-3 font-black text-blue-900 text-sm uppercase tracking-widest">
                                    <span className="p-1.5 bg-blue-100 rounded-lg"><ShieldCheck size={16} className="text-blue-600" /></span>
                                    Prescription Policy
                                </h4>
                                <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                                    You must upload a valid, clear prescription from a registered medical practitioner for all prescription-only medications. We reserve the right to reject invalid prescriptions.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h4 className="flex items-center gap-3 font-black text-blue-900 text-sm uppercase tracking-widest">
                                    <span className="p-1.5 bg-amber-100 rounded-lg"><AlertCircle size={16} className="text-amber-600" /></span>
                                    Return & Refund Policy
                                </h4>
                                <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                                    Due to health and safety regulations, medicinal products cannot be returned once delivered unless they are damaged or incorrect. Shipping charges (Rs. 400) are non-refundable.
                                </p>
                            </section>

                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100/50">
                                <p className="text-[13px] text-slate-500 font-bold leading-relaxed italic">
                                    "Your health is our priority. We ensure the highest quality of service but are not liable for individual physiological reactions to medications."
                                </p>
                            </div>
                        </div>

                        <footer className="p-6 bg-white border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setShowTerms(false)}
                                className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95"
                            >
                                I Understand & Agree
                            </button>
                        </footer>
                    </div>
                </div>,
                document.body
            )}

        </section>
    );
};

export default OrderSummary;