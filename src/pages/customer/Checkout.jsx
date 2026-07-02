import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { useCartStore } from '../../stores/cartStore';
import BillingDetails from '../../components/checkout/BillingDetails';
import OrderSummary from '../../components/checkout/OrderSummary';
import { getAuthHeaders } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { updateDispensedRecord, getDispensedHistory } from '../../services/pharmacistService';

const Checkout = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { getTotal, clearCart, items } = useCartStore();
    const { currentUser } = useAuth();
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
        NOTIFY_URL: "http://localhost:5000/api/customer-orders/notify",
        RETURN_URL: `${window.location.origin}/customer/checkout/success`,
        CANCEL_URL: `${window.location.origin}/customer/checkout/cancel`,
    };

    const [orderData, setOrderData] = useState({
        email: currentUser?.email || '',
        firstName: queryParams.get('fname') || '',
        lastName:  queryParams.get('lname') || '',
        country: 'Sri Lanka',
        houseNumber: queryParams.get('addr')?.split(',')[0]?.trim() || '',
        laneStreet:  queryParams.get('addr')?.split(',').slice(1).join(',')?.trim() || '',
        city: '',
        phone: queryParams.get('phone') || '',
        orderNotes: '',
        agreeTerms: false,
        paymentMethod: 'ONLINE'
    });

    useEffect(() => {
        if (currentUser?.email && !orderData.email) {
            setOrderData(prev => ({ ...prev, email: currentUser.email }));
        }
    }, [currentUser?.email, orderData.email]);

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
            // Skip creating a CustomerOrders record when paying for a prescription
            if (!rxId) {
                const authHeaders = await getAuthHeaders();
                const response = await fetch('http://localhost:5000/api/customer-orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({
                        ...orderData,
                        userId:       currentUser?.uid || null,
                        orderId:      referenceId,
                        totalAmount:  parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                        orderStatus:  orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending-COD',
                        items:        items.map(item => ({
                            id:        item.id,
                            productId: item.productId || '',
                            stockId:   item.stockId   || '',
                            name:      item.name,
                            price:     item.price,
                            quantity:  item.qty,
                            imageUrl:  item.imageUrl || '',
                            category:  item.category || '',
                        })),
                        categories: [...new Set(items.map(item => item.category || '').filter(Boolean))],
                    }),
                });

                if (!response.ok) {
                    const errorLog = await response.json();
                    console.error("Backend Error:", errorLog);
                    throw new Error("Order persistence failed");
                }

            }

            if (shouldClearCart) {
                const userId = currentUser?.uid || sessionStorage.getItem('userId');
                if (userId) await clearCart(userId);
            }

            if (rxId) {
                try {
                    const { db } = await import('../../lib/firebase');
                    const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');

                    const rxRef = doc(db, 'prescriptions', rxId);
                    const rxSnap = await getDoc(rxRef);
                    const rxData = rxSnap.exists() ? rxSnap.data() : null;

                    if (rxData) {
                        const history = await getDispensedHistory();
                        const existingRecord = history.find(h => h.rxId === rxId);

                        const dispensePayload = {
                            rxId: rxId,
                            patientName: `${orderData.firstName} ${orderData.lastName}`,
                            verifiedPatient: `${orderData.firstName} ${orderData.lastName}`,
                            phone: orderData.phone,
                            address: `${orderData.houseNumber}, ${orderData.laneStreet}, ${orderData.city}`,
                            orderItems: rxData.orderItems || rxData.medications || [],
                            total: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                            paymentStatus: orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'COD',
                            paymentMethod: orderData.paymentMethod,
                            createdAt: new Date().toISOString(),
                            finalized: false
                        };

                        if (existingRecord) {
                            await updateDispensedRecord(existingRecord.firebaseId || existingRecord.id, dispensePayload);
                        } else {
                            const { addDispensedRecord } = await import('../../services/pharmacistService');
                            await addDispensedRecord(dispensePayload);
                        }

                        await updateDoc(rxRef, {
                            status: orderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Ready to Collect',
                            customerConfirmed: true,
                            paymentMethod: orderData.paymentMethod,
                            confirmedAt: Timestamp.now(),
                            customerAddress: `${orderData.houseNumber}, ${orderData.laneStreet}, ${orderData.city}`
                        });

                        // Update pharmacistDispensed collection if payment is online
                        if (orderData.paymentMethod === 'ONLINE') {
                            try {
                                const { query, collection, where, getDocs, serverTimestamp } = await import('firebase/firestore');
                                const q = query(collection(db, 'pharmacistDispensed'), where('rxId', '==', rxId));
                                const snap = await getDocs(q);
                                if (!snap.empty) {
                                    await updateDoc(snap.docs[0].ref, {
                                        paymentStatus: 'paid',
                                        status: 'completed',
                                        paidAt: serverTimestamp(),
                                    });
                                }
                            } catch (err) {
                                console.error("Failed to update pharmacistDispensed collection:", err);
                            }
                        }

                        console.log("Prescription and Dispensing records synchronized for RX:", rxId);
                    }
                } catch (err) {
                    console.error("Critical: Failed to sync prescription/dispensing data:", err);
                }
            }

            navigate('/customer/checkout/success', {
                state: { totalAmount: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT) }
            });
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
                            prescriptionTotal={rxId ? rxAmount : null}
                            prescriptionItems={queryParams.get('items')}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default Checkout;