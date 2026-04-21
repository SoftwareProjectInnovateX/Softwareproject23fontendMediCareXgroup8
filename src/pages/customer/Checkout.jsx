import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import BillingDetails from '../../components/checkout/BillingDetails';
import OrderSummary from '../../components/checkout/OrderSummary';

// Centralized configuration for payment settings to allow easy maintenance
const PAYMENT_GATEWAY_CONFIG = {
    MERCHANT_ID: "1235095",
    MERCHANT_SECRET: "MzA5OTIzMDE4OTM4MTA0NjU1NzI1Nzg1",
    CURRENCY: "LKR",
    TOTAL_AMOUNT: "8000.00",
    NOTIFY_URL: "http://localhost:5000/orders/notify"
};

const Checkout = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    
    // State management for the entire checkout form
    const [orderData, setOrderData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        country: 'Sri Lanka',
        houseNumber: '',
        laneStreet: '',
        city: '',
        phone: '',
        orderNotes: '',
        agreeTerms: false,
        paymentMethod: 'ONLINE' 
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePlaceOrder = () => {
        const { firstName, lastName, email, phone, houseNumber, laneStreet, city, agreeTerms } = orderData;
        
        // Ensure all mandatory fields are completed before proceeding
        if (!firstName || !lastName || !email || !phone || !houseNumber || !laneStreet || !city) {
            alert("Please fill in all required fields marked with *");
            return;
        }

        if (!agreeTerms) {
            alert("Please accept the terms and conditions to proceed.");
            return;
        }

        setIsLoading(true);

        if (orderData.paymentMethod === 'ONLINE') {
            processOnlinePayment();
        } else {
            handleOrderSubmission(`COD_${Date.now()}`);
        }
    };

    const processOnlinePayment = () => {
        const orderId = `MCX${Date.now()}`;
        
        // Generating a security hash to verify request authenticity with PayHere
        const hashedSecret = CryptoJS.MD5(PAYMENT_GATEWAY_CONFIG.MERCHANT_SECRET).toString().toUpperCase();
        const authString = PAYMENT_GATEWAY_CONFIG.MERCHANT_ID + orderId + PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT + PAYMENT_GATEWAY_CONFIG.CURRENCY + hashedSecret;
        const securityHash = CryptoJS.MD5(authString).toString().toUpperCase();

        const paymentPayload = {
            sandbox: true,
            merchant_id: PAYMENT_GATEWAY_CONFIG.MERCHANT_ID,
            return_url: `${window.location.origin}/checkout/success`,
            cancel_url: `${window.location.origin}/checkout/cancel`,
            notify_url: PAYMENT_GATEWAY_CONFIG.NOTIFY_URL,
            order_id: orderId,
            items: "MediCareX Medicine Order",
            amount: PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT,
            currency: PAYMENT_GATEWAY_CONFIG.CURRENCY,
            hash: securityHash,
            first_name: orderData.firstName,
            last_name: orderData.lastName,
            email: orderData.email,
            phone: orderData.phone,
            address: `${orderData.houseNumber}, ${orderData.laneStreet}`,
            city: orderData.city,
            country: "Sri Lanka",
        };

        if (window.payhere) {
            window.payhere.startPayment(paymentPayload);

            window.payhere.onCompleted = (confirmedOrderId) => {
                handleOrderSubmission(confirmedOrderId);
            };

            window.payhere.onDismissed = () => {
                setIsLoading(false);
            };

            window.payhere.onError = (error) => {
                setIsLoading(false);
                alert(`Payment process failed: ${error}`);
            };
        } else {
            setIsLoading(false);
            alert("Payment SDK failed to load. Please check your internet connection.");
        }
    };

    const handleOrderSubmission = async (referenceId) => {
        try {
            const response = await fetch('http://localhost:5000/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...orderData,
                    orderId: referenceId,
                    totalAmount: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                    orderStatus: orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending-COD'
                }),
            });

            if (response.ok) {
                navigate('/checkout/success');
            } else {
                throw new Error("Order persistence failed on server side");
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("Connectivity issue: Unable to save your order. Please contact support.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-800">
            <nav className="max-w-7xl mx-auto px-4 py-4 text-sm text-slate-500 border-b border-slate-100 mb-8">
                Home &gt; <span className="text-blue-900 font-medium">Checkout</span>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pb-20">
                <header>
                    <h1 className="text-4xl font-bold text-blue-900 mb-10">Checkout</h1>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <section className="lg:col-span-7">
                        <BillingDetails 
                            formData={orderData} 
                            handleInputChange={handleInputChange} 
                        />
                    </section>
                    
                    <aside className="lg:col-span-5">
                        <OrderSummary 
                            formData={orderData} 
                            handleInputChange={handleInputChange} 
                            handlePlaceOrder={handlePlaceOrder}
                            isLoading={isLoading}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default Checkout;