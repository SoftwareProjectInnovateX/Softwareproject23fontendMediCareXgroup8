import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryForm from '../../components/checkout/DeliveryForm';
import OrderSummary from '../../components/checkout/OrderSummary';
import PaymentMethod from '../../components/checkout/PaymentMethod';

const Checkout = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    
    // පාරිභෝගික දත්ත ගබඩා කිරීම
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        phone: '',
        street: '',
        city: '',
        paymentMethod: 'ONLINE', // Default: Online Payment
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // PayHere ගෙවීම් ක්‍රියාවලිය පටන් ගැනීම
    const handlePlaceOrder = () => {
        if (formData.paymentMethod === 'ONLINE') {
            startPayHerePayment();
        } else {
            saveOrderToBackend("COD_" + Date.now());
        }
    };

    const startPayHerePayment = () => {
        const orderId = "MCX_" + Date.now();
        
        const payment = {
            sandbox: true, // Sandbox mode සක්‍රීයයි
            merchant_id: "YOUR_MERCHANT_ID", // ඔයාගේ Merchant ID එක මෙතනට දාන්න
            return_url: window.location.origin + '/checkout/success',
            cancel_url: window.location.origin + '/checkout',
            notify_url: 'http://localhost:5000/orders/notify', // NestJS Backend URL එක
            order_id: orderId,
            items: "MediCareX Medicine Order",
            amount: "10000.00",
            currency: "LKR",
            first_name: formData.firstName,
            last_name: "",
            email: formData.email,
            phone: formData.phone,
            address: formData.street,
            city: formData.city,
            country: "Sri Lanka",
        };

        if (window.payhere) {
            window.payhere.startPayment(payment);

            window.payhere.onCompleted = (orderId) => {
                console.log("Payment completed. OrderID:" + orderId);
                saveOrderToBackend(orderId);
            };

            window.payhere.onDismissed = () => {
                alert("Payment dismissed");
            };

            window.payhere.onError = (error) => {
                alert("Payment Error: " + error);
            };
        }
    };

    // NestJS Backend එකට සහ Firebase වලට දත්ත යැවීම
    const saveOrderToBackend = async (confirmedOrderId) => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    orderId: confirmedOrderId,
                    amount: 10000,
                    status: 'Paid'
                }),
            });

            if (response.ok) {
                navigate('/checkout/success');
            }
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Failed to save order. Please contact support.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <h1 className="text-3xl font-bold text-blue-900 mb-8">Checkout</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* වම් පැත්ත: පෝරමය */}
                    <div className="lg:col-span-8 space-y-6">
                        <DeliveryForm formData={formData} handleInputChange={handleInputChange} />
                        <PaymentMethod 
                            selectedMethod={formData.paymentMethod} 
                            setMethod={(m) => setFormData({...formData, paymentMethod: m})} 
                        />
                    </div>

                    {/* දකුණු පැත්ත: සාරාංශය */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-6">
                            <OrderSummary subtotal={9500} delivery={500} />
                            <button 
                                onClick={handlePlaceOrder}
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mt-6 transition-all shadow-lg"
                            >
                                {isLoading ? "Processing..." : "Confirm & Pay Now"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;