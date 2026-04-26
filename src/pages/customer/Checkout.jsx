import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { useCartStore } from '../../stores/cartStore';
import BillingDetails from '../../components/checkout/BillingDetails';
import OrderSummary from '../../components/checkout/OrderSummary';
import { getAuthHeaders } from '../../services/firebase';
import { updateDispensedRecord, getDispensedHistory } from '../../services/pharmacistService';

const Checkout = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { getTotal, clearCart, items } = useCartStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const rxId = queryParams.get('rxId');
    const rxAmount = parseFloat(queryParams.get('amount') || '0');

    const PAYMENT_GATEWAY_CONFIG = {
        MERCHANT_ID: "1235095",
        MERCHANT_SECRET: "NDUxMTU1MDYxNDEyNDEyMTgyMjM3MTEzMTYyMjMwMzQ0OTc1MjM=",
        CURRENCY: "LKR",
        TOTAL_AMOUNT: (rxId ? rxAmount : getTotal()).toFixed(2),
        NOTIFY_URL: "http://localhost:5000/api/orders/notify",
        RETURN_URL: `${window.location.origin}/customer/checkout/success`,
        CANCEL_URL: `${window.location.origin}/customer/checkout/cancel`,
    };

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
            handleOrderSubmission(`COD_${Date.now()}`, true);
        }
    };

    const processOnlinePayment = () => {
        const orderId = `MCX${Date.now()}`;

        const hashedSecret = CryptoJS.MD5(PAYMENT_GATEWAY_CONFIG.MERCHANT_SECRET).toString().toUpperCase();
        const authString = PAYMENT_GATEWAY_CONFIG.MERCHANT_ID + orderId + PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT + PAYMENT_GATEWAY_CONFIG.CURRENCY + hashedSecret;
        const securityHash = CryptoJS.MD5(authString).toString().toUpperCase();

        const paymentPayload = {
            sandbox: true,
            merchant_id: PAYMENT_GATEWAY_CONFIG.MERCHANT_ID,
            return_url:  PAYMENT_GATEWAY_CONFIG.RETURN_URL,
            cancel_url:  PAYMENT_GATEWAY_CONFIG.CANCEL_URL,
            notify_url:  PAYMENT_GATEWAY_CONFIG.NOTIFY_URL,
            order_id:    orderId,
            items:       "MediCareX Medicine Order",
            amount:      PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT,
            currency:    PAYMENT_GATEWAY_CONFIG.CURRENCY,
            hash:        securityHash,
            first_name:  orderData.firstName,
            last_name:   orderData.lastName,
            email:       orderData.email,
            phone:       orderData.phone,
            address:     `${orderData.houseNumber}, ${orderData.laneStreet}`,
            city:        orderData.city,
            country:     "Sri Lanka",
        };

        if (window.payhere) {
            window.payhere.startPayment(paymentPayload);

            window.payhere.onCompleted = (confirmedOrderId) => {
                handleOrderSubmission(confirmedOrderId, true);
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
            alert("Payment SDK failed to load.");
        }
    };

    const handleOrderSubmission = async (referenceId, shouldClearCart = false) => {
        try {
            const authHeaders = await getAuthHeaders();
            const response = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({
                    ...orderData,
                    orderId:      referenceId,
                    totalAmount:  parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                    orderStatus:  orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending-COD',
                    items:        items.map(item => ({
                        id:       item.id,
                        name:     item.name,
                        price:    item.price,
                        quantity: item.qty,
                        imageUrl: item.imageUrl || '',
                    })),
                }),
            });

            if (response.ok) {
                // If this was a prescription order, update the dispensing queue status
                if (rxId) {
                    try {
                        const history = await getDispensedHistory();
                        const record = history.find(h => h.rxId === rxId);
                        if (record) {
                            await updateDispensedRecord(record.firebaseId || record.id, {
                                paymentStatus: orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending-COD',
                                paymentMethod: orderData.paymentMethod
                            });
                            console.log("Dispensing record updated successfully for RX:", rxId);
                        }
                    } catch (err) {
                        console.error("Failed to update dispensing status:", err);
                    }
                }

                if (shouldClearCart && !rxId) clearCart();
                navigate('/customer/checkout/success', {
                    state: { totalAmount: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT) }
                });
            } else {
                const errorLog = await response.json();
                console.error("Backend Error:", errorLog);
                throw new Error("Order persistence failed");
            }
        } catch (error) {
            console.error("Submission error:", error);
            alert("Connectivity issue: Unable to save your order to the server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-sans" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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