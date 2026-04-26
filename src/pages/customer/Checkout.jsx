import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { useCartStore } from '../../stores/cartStore';
import { useAuth } from '../../context/AuthContext';
import BillingDetails from '../../components/checkout/BillingDetails';
import OrderSummary from '../../components/checkout/OrderSummary';
import { updateDispensedRecord, getDispensedHistory } from '../../services/pharmacistService';

const Checkout = () => {
    const { currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { getTotal, clearCart, items } = useCartStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const rxIdParam = queryParams.get('rxId');
    const rxId = (rxIdParam && rxIdParam !== 'null') ? rxIdParam : null;
    const rxAmount = parseFloat(queryParams.get('amount') || '0');
    const [rxData, setRxData] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [paymentStep, setPaymentStep] = useState('IDLE'); // IDLE, PAYING, COMPLETED

    // Handle PayHere Redirect Return
    useEffect(() => {
        const paymentStatus = queryParams.get('payment_status');
        const returnedOrderId = queryParams.get('order_id');

        if (paymentStatus === 'success' && returnedOrderId) {
            // Restore state
            const savedData = sessionStorage.getItem('pendingOrderData');
            const savedRxId = sessionStorage.getItem('pendingRxId');
            const savedRxAmount = sessionStorage.getItem('pendingRxAmount');

            let parsedData = orderData;
            if (savedData) {
                parsedData = JSON.parse(savedData);
                setOrderData(parsedData);
                sessionStorage.removeItem('pendingOrderData');
            }

            let restoredRxId = null;
            if (savedRxId && savedRxId !== 'null') {
                restoredRxId = savedRxId;
                sessionStorage.removeItem('pendingRxId');
            }
            if (savedRxAmount) {
                sessionStorage.removeItem('pendingRxAmount');
            }

            setPaymentStep('COMPLETED');
            setIsLoading(true);
            
            // Confirm with backend locally
            fetch(`http://localhost:5000/api/orders/${returnedOrderId}/confirm`, { method: 'POST' })
                .then(res => {
                    if (res.ok) {
                        finalizeMediCareXOrder(returnedOrderId, true, true, parsedData, restoredRxId);
                    } else {
                        throw new Error("Confirmation failed");
                    }
                })
                .catch(e => {
                    console.error("Local confirm error", e);
                    setPaymentError("Payment verification failed.");
                    setIsLoading(false);
                });

            // Clean the URL, but restore rxId if needed so UI doesn't break
            let newSearch = `?`;
            if (restoredRxId) newSearch += `rxId=${restoredRxId}&amount=${savedRxAmount || 0}`;
            const newUrl = window.location.pathname + (newSearch === '?' ? '' : newSearch);
            window.history.replaceState({}, document.title, newUrl);

        } else if (paymentStatus === 'cancel') {
            const savedData = sessionStorage.getItem('pendingOrderData');
            const savedRxId = sessionStorage.getItem('pendingRxId');
            const savedRxAmount = sessionStorage.getItem('pendingRxAmount');
            
            if (savedData) {
                setOrderData(JSON.parse(savedData));
                sessionStorage.removeItem('pendingOrderData');
            }
            let restoredRxId = null;
            if (savedRxId && savedRxId !== 'null') {
                restoredRxId = savedRxId;
                sessionStorage.removeItem('pendingRxId');
            }
            if (savedRxAmount) {
                sessionStorage.removeItem('pendingRxAmount');
            }
            
            setPaymentError("Payment was cancelled or failed. Please try again.");
            
            let newSearch = `?`;
            if (restoredRxId) newSearch += `rxId=${restoredRxId}&amount=${savedRxAmount || 0}`;
            const newUrl = window.location.pathname + (newSearch === '?' ? '' : newSearch);
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [location.search]);

    useEffect(() => {
        if (rxId) {
            const fetchPrescription = async () => {
                try {
                    const { db } = await import('../../lib/firebase');
                    const { doc, getDoc } = await import('firebase/firestore');
                    
                    // 1. Fetch Prescription Data
                    const rxRef = doc(db, 'prescriptions', rxId);
                    const rxSnap = await getDoc(rxRef);
                    
                    if (rxSnap.exists()) {
                        const data = rxSnap.data();
                        setRxData(data);
                        
                        let targetEmail = null;

                        // 2. Fetch Customer Profile using userId from prescription
                        if (data.userId) {
                            const userRef = doc(db, 'users', data.userId);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                targetEmail = userSnap.data().email;
                            }
                        }

                        // 3. Fallback: Search by phone number if email not found yet
                        if (!targetEmail && (data.customerPhone || data.phone)) {
                            const { query, collection, where, getDocs } = await import('firebase/firestore');
                            const phoneToSearch = data.customerPhone || data.phone;
                            const q = query(collection(db, 'users'), where('phone', '==', phoneToSearch));
                            const querySnap = await getDocs(q);
                            
                            if (!querySnap.empty) {
                                targetEmail = querySnap.docs[0].data().email;
                            }
                        }

                        if (targetEmail) {
                            setOrderData(prev => ({ ...prev, email: targetEmail }));
                        }
                    }
                } catch (error) {
                    console.error("Error fetching prescription details:", error);
                }
            };
            fetchPrescription();
        }
    }, [rxId]);

    const PAYMENT_GATEWAY_CONFIG = {
        MERCHANT_ID: "1235095",
        MERCHANT_SECRET: "NDUxMTU1MDYxNDEyNDEyMTgyMjM3MTEzMTYyMjMwMzQ0OTc1MjM=",
        CURRENCY: "LKR",
        TOTAL_AMOUNT: (parseFloat(rxId ? rxAmount : getTotal()) + 400).toFixed(2),
        NOTIFY_URL: "http://localhost:5000/api/orders/notify",
        RETURN_URL: `${window.location.origin}/customer/checkout${window.location.search}`,
        CANCEL_URL: `${window.location.origin}/customer/checkout${window.location.search}`,
    };

    const [orderData, setOrderData] = useState({
        email: currentUser?.email || '',
        firstName: queryParams.get('fname') || '',
        lastName:  queryParams.get('lname') || '',
        country: 'Sri Lanka',
        district: '', // New field
        houseNumber: queryParams.get('addr')?.split(',')[0]?.trim() || '',
        laneStreet:  queryParams.get('addr')?.split(',').slice(1).join(',')?.trim() || '',
        city: '',
        phone: queryParams.get('phone') || '',
        secondaryPhone: '', // New field
        orderNotes: '',
        agreeTerms: false,
        paymentMethod: 'ONLINE'
    });

    // Update email if currentUser becomes available later
    useEffect(() => {
        if (currentUser?.email && !orderData.email) {
            setOrderData(prev => ({ ...prev, email: currentUser.email }));
        }
    }, [currentUser, orderData.email]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePlaceOrder = async () => {
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
        setPaymentError(null); // Reset error on new attempt

        if (orderData.paymentMethod === 'ONLINE') {
            const tempOrderId = `MCX${Date.now()}`;
            try {
                const response = await fetch('http://localhost:5000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...orderData,
                        orderId:      tempOrderId,
                        totalAmount:  parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                        orderStatus:  'Pending',
                        paymentStatus: 'pending',
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
                    processOnlinePayment(tempOrderId);
                } else {
                    throw new Error("Failed to initialize order");
                }
            } catch (err) {
                console.error(err);
                setIsLoading(false);
                setPaymentError("Could not connect to server to initialize payment.");
            }
        } else {
            finalizeMediCareXOrder(`COD_${Date.now()}`, true, false);
        }
    };

    const processOnlinePayment = (orderId) => {
        // Save form state so it is not lost after redirect
        sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData));
        sessionStorage.setItem('pendingRxId', rxId || 'null');
        sessionStorage.setItem('pendingRxAmount', rxAmount || '0');

        const hashedSecret = CryptoJS.MD5(PAYMENT_GATEWAY_CONFIG.MERCHANT_SECRET).toString().toUpperCase();
        const authString = PAYMENT_GATEWAY_CONFIG.MERCHANT_ID + orderId + PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT + PAYMENT_GATEWAY_CONFIG.CURRENCY + hashedSecret;
        const securityHash = CryptoJS.MD5(authString).toString().toUpperCase();

        const returnUrl = `${window.location.origin}${window.location.pathname}?payment_status=success&order_id=${orderId}`;
        const cancelUrl = `${window.location.origin}${window.location.pathname}?payment_status=cancel&order_id=${orderId}`;

        const form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", "https://sandbox.payhere.lk/pay/checkout");

        const params = {
            merchant_id: PAYMENT_GATEWAY_CONFIG.MERCHANT_ID,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            notify_url: PAYMENT_GATEWAY_CONFIG.NOTIFY_URL,
            order_id: orderId,
            items: "MediCareX Medicine Order",
            currency: PAYMENT_GATEWAY_CONFIG.CURRENCY,
            amount: PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT,
            first_name: orderData.firstName,
            last_name: orderData.lastName,
            email: orderData.email,
            phone: orderData.phone,
            address: `${orderData.houseNumber}, ${orderData.laneStreet}`,
            city: orderData.city,
            country: "Sri Lanka",
            hash: securityHash
        };

        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                const hiddenField = document.createElement("input");
                hiddenField.setAttribute("type", "hidden");
                hiddenField.setAttribute("name", key);
                hiddenField.setAttribute("value", params[key]);
                form.appendChild(hiddenField);
            }
        }

        document.body.appendChild(form);
        form.submit();
    };

    const finalizeMediCareXOrder = async (referenceId, shouldClearCart = false, isAlreadyCreated = false, currentOrderData = orderData, currentRxId = rxId) => {
        try {
            let responseOk = true;

            if (!isAlreadyCreated) {
                // If it's a prescription payment, use rxItems, else use cart items
                let finalItems = [];
                if (currentRxId) {
                    try {
                        const parsedItems = JSON.parse(new URLSearchParams(window.location.search).get('items') || '[]');
                        finalItems = parsedItems.map(item => ({
                            id:       item.id || 'rx-med',
                            name:     item.name,
                            price:    item.price || (item.total / (item.qty || 1)) || 0,
                            quantity: item.qty || 1,
                            imageUrl: item.imageUrl || '',
                        }));
                    } catch (e) {
                        console.error("Error parsing rxItems:", e);
                    }
                } else {
                    finalItems = items.map(item => ({
                        id:       item.id,
                        name:     item.name,
                        price:    item.price,
                        quantity: item.qty,
                        imageUrl: item.imageUrl || '',
                    }));
                }

                const response = await fetch('http://localhost:5000/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...currentOrderData,
                        orderId:      referenceId,
                        totalAmount:  parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                        orderStatus:  currentOrderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Pending-COD',
                        items:        finalItems,
                    }),
                });
                responseOk = response.ok;
                if (!responseOk) {
                   const errorLog = await response.json();
                   console.error("Backend Error:", errorLog);
                   throw new Error("Order persistence failed");
                }
            }

            if (responseOk) {
                let orderItemsForSuccess = [];
                if (currentRxId) {
                    try {
                        const { db } = await import('../../lib/firebase');
                        const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
                        
                        // 1. Fetch full prescription details from Firestore
                        const rxRef = doc(db, 'prescriptions', currentRxId);
                        const rxSnap = await getDoc(rxRef);
                        const rxData = rxSnap.exists() ? rxSnap.data() : null;

                        if (rxData) {
                            orderItemsForSuccess = rxData.orderItems || rxData.medications || [];
                            // 2. Update/Create Dispensing Queue Record (Backend API)
                            const history = await getDispensedHistory();
                            const existingRecord = history.find(h => h.rxId === currentRxId);
                            
                            const dispensePayload = {
                                rxId: currentRxId,
                                patientName: `${currentOrderData.firstName} ${currentOrderData.lastName}`,
                                verifiedPatient: `${currentOrderData.firstName} ${currentOrderData.lastName}`,
                                phone: currentOrderData.phone,
                                address: `${currentOrderData.houseNumber}, ${currentOrderData.laneStreet}, ${currentOrderData.city}`,
                                orderItems: orderItemsForSuccess,
                                total: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                                paymentStatus: currentOrderData.paymentMethod === 'ONLINE' ? 'Paid' : 'COD',
                                paymentMethod: currentOrderData.paymentMethod,
                                createdAt: new Date().toISOString(),
                                finalized: false
                            };

                            if (existingRecord) {
                                await updateDispensedRecord(existingRecord.firebaseId || existingRecord.id, dispensePayload);
                            } else {
                                const { addDispensedRecord } = await import('../../services/pharmacistService');
                                await addDispensedRecord(dispensePayload);
                            }

                            // 3. Update Prescription Status in Firestore
                            await updateDoc(rxRef, {
                                status: currentOrderData.paymentMethod === 'ONLINE' ? 'Paid' : 'Ready to Collect',
                                customerConfirmed: true,
                                paymentMethod: currentOrderData.paymentMethod,
                                confirmedAt: Timestamp.now(),
                                // Update address in Firestore too
                                customerAddress: `${currentOrderData.houseNumber}, ${currentOrderData.laneStreet}, ${currentOrderData.city}`
                            });
                            
                            console.log("Prescription and Dispensing records synchronized for RX:", currentRxId);
                        }
                    } catch (err) {
                        console.error("Critical: Failed to sync prescription/dispensing data:", err);
                    }
                } else {
                    orderItemsForSuccess = items.map(item => ({
                        name: item.name,
                        price: item.price,
                        qty: item.qty
                    }));
                }

                if (shouldClearCart && !currentRxId) clearCart();
                navigate('/customer/checkout/success', {
                    state: { 
                        totalAmount: parseFloat(PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT),
                        orderData: { 
                            ...currentOrderData, 
                            orderId: referenceId,
                            items: orderItemsForSuccess
                        }
                    }
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
        <div className="min-h-screen bg-white font-sans text-slate-800">

            <main className="max-w-7xl mx-auto px-6 pb-20">
                <header>
                    <h1 className="text-4xl font-bold text-blue-900 mb-10">Checkout</h1>
                </header>

                {paymentError && (
                    <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                        <div className="p-2 bg-red-100 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800">Payment Unsuccessful</h3>
                            <p className="text-sm opacity-90">{paymentError}</p>
                        </div>
                    </div>
                )}

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
                            prescriptionItems={rxData ? JSON.stringify(rxData.orderItems || rxData.medications || []) : queryParams.get('items')}
                            cartItems={items}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default Checkout;