import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../../stores/cartStore';
import { useAuth } from '../../context/AuthContext';
import BillingDetails from '../../components/checkout/BillingDetails';
import OrderSummary from '../../components/checkout/OrderSummary';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getAuthHeaders } from '../../services/firebase';
import { C, FONT } from '../../components/profile/profileTheme';


const Checkout = () => {
    const { currentUser, getCurrentUserData } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const { getTotal, clearCart, restoreCart, items } = useCartStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const rxIdParam = queryParams.get('rxId');
    const rxId = (rxIdParam && rxIdParam !== 'null') ? rxIdParam : null;
    const rxAmount = parseFloat(queryParams.get('amount') || '0');
    const [rxData, setRxData] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    const [paymentStep, setPaymentStep] = useState('IDLE'); // IDLE, PAYING, COMPLETED
    const [originalProfileAddress, setOriginalProfileAddress] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const isProcessingReturn = React.useRef(false);
    const isSuccessNavigating = React.useRef(false);

    // Handle Browser Back Button (bfcache)
    useEffect(() => {
        const handlePageShow = () => {
            setIsLoading(false);
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // Prevent loading checkout with empty cart
    useEffect(() => {
        const currentPaymentStatus = new URLSearchParams(location.search).get('payment_status');
        // We only redirect if it's not a prescription checkout, 
        // and cart is completely empty, and we aren't returning from a payment gateway,
        // and we aren't currently navigating to the success page
        if (!rxId && (!items || items.length === 0) && !isProcessingReturn.current && !currentPaymentStatus && !isSuccessNavigating.current) {
            navigate('/customer/cart', { replace: true });
        }
    }, [items, rxId, navigate, location.search]);


    // Handle PayHere Redirect Return
    useEffect(() => {
        const paymentStatus = queryParams.get('payment_status');
        const returnedOrderId = queryParams.get('order_id');

        if (paymentStatus === 'success' && returnedOrderId) {
            if (isProcessingReturn.current) return;
            isProcessingReturn.current = true;

            // Restore state
            const savedData = sessionStorage.getItem('pendingOrderData');
            
            // If savedData is missing, this is a back navigation from a completed order.
            // Redirect to home to prevent loops or double processing.
            if (!savedData) {
                navigate('/customer', { replace: true });
                return;
            }

            const savedRxId = sessionStorage.getItem('pendingRxId');
            const savedRxAmount = sessionStorage.getItem('pendingRxAmount');

            let parsedData = orderData;
            parsedData = JSON.parse(savedData);
            setOrderData(parsedData);
            sessionStorage.removeItem('pendingOrderData');

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
            
            // Just finalize navigation for online success, backend webhook handles DB
            finalizeMediCareXOrder(returnedOrderId, true, true, parsedData, restoredRxId);

            // Clean the URL, but restore rxId if needed so UI doesn't break
            let newSearch = `?`;
            if (restoredRxId) newSearch += `rxId=${restoredRxId}&amount=${savedRxAmount || 0}`;
            const newUrl = window.location.pathname + (newSearch === '?' ? '' : newSearch);
            window.history.replaceState({}, document.title, newUrl);

        } else if (paymentStatus === 'cancel') {
            if (isProcessingReturn.current) return;
            isProcessingReturn.current = true;

            const savedData = sessionStorage.getItem('pendingOrderData');
            
            if (!savedData) {
                navigate('/customer/cart', { replace: true });
                return;
            }

            const savedRxId = sessionStorage.getItem('pendingRxId');
            const savedRxAmount = sessionStorage.getItem('pendingRxAmount');
            
            const savedCartItems = sessionStorage.getItem('pendingCartItems');
            
            setOrderData(JSON.parse(savedData));
            sessionStorage.removeItem('pendingOrderData');
            if (savedCartItems) {
                restoreCart(JSON.parse(savedCartItems));
                sessionStorage.removeItem('pendingCartItems');
            }
            let restoredRxId = null;
            if (savedRxId && savedRxId !== 'null') {
                restoredRxId = savedRxId;
                sessionStorage.removeItem('pendingRxId');
            }
            if (savedRxAmount) {
                sessionStorage.removeItem('pendingRxAmount');
            }
            
            setPaymentError("Payment was cancelled. You can try again.");
            
            // Clean the URL, but restore rxId if needed so UI doesn't break
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
        CURRENCY: "LKR",
        TOTAL_AMOUNT: (parseFloat(rxId ? rxAmount : getTotal()) + 400).toFixed(2),
        NOTIFY_URL: `${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api/customer-orders/notify`,
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
        paymentMethod: 'ONLINE',
        saveAddressToProfile: false
    });

    // Update email and profile data if currentUser becomes available
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (currentUser) {
                const userData = await getCurrentUserData();
                if (userData) {
                    let fName = queryParams.get('fname') || '';
                    let lName = queryParams.get('lname') || '';
                    
                    if (userData.fullName && !fName && !lName) {
                        const parts = userData.fullName.split(' ');
                        fName = parts[0] || '';
                        lName = parts.slice(1).join(' ') || '';
                    }

                    const profileDistrict = userData.district || '';
                    const profileCity = userData.city || '';
                    const profileHouseNumber = userData.houseNumber || '';
                    const profileLaneStreet = userData.laneStreet || '';

                    setOriginalProfileAddress({
                        district: profileDistrict,
                        city: profileCity,
                        houseNumber: profileHouseNumber,
                        laneStreet: profileLaneStreet
                    });

                    setOrderData(prev => ({ 
                        ...prev, 
                        email: currentUser.email || prev.email,
                        firstName: prev.firstName || fName,
                        lastName: prev.lastName || lName,
                        phone: prev.phone || userData.phone || '',
                        district: prev.district || profileDistrict,
                        city: prev.city || profileCity,
                        houseNumber: prev.houseNumber || profileHouseNumber,
                        laneStreet: prev.laneStreet || profileLaneStreet,
                    }));
                }
            }
        };
        fetchUserProfile();
    }, [currentUser]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOrderData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear general errors as user types
        if (formErrors[name] && name !== 'phone' && name !== 'secondaryPhone') {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Real-time validation for phone numbers
        if (name === 'phone' || name === 'secondaryPhone') {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                if (name === 'phone' && !value) {
                    newErrors.phone = "Phone number is required";
                } else if (value) {
                    if (/^\+(?!94)/.test(value.replace(/\s+/g, ''))) {
                        newErrors[name] = "Sorry, our services are only available within Sri Lanka (+94)";
                    } else if (!/^(?:0|\+94)\d{9}$/.test(value.replace(/\s+/g, ''))) {
                        newErrors[name] = "Must be a valid Sri Lankan number (e.g. 071... or +9471...)";
                    } else {
                        delete newErrors[name];
                    }
                } else if (name === 'secondaryPhone' && !value) {
                    delete newErrors.secondaryPhone;
                }
                return newErrors;
            });
        }
    };

    const handlePlaceOrder = async () => {
        const { firstName, lastName, email, phone, secondaryPhone, houseNumber, laneStreet, city, district, agreeTerms } = orderData;
        const errors = {};

        if (!rxId && (!items || items.length === 0)) {
            setPaymentError("Your cart is empty. Please add items to your cart before placing an order.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!firstName) errors.firstName = "First name is required";
        if (!lastName) errors.lastName = "Last name is required";
        if (!email) errors.email = "Email is required";
        
        if (!phone) {
            errors.phone = "Phone number is required";
        } else if (/^\+(?!94)/.test(phone.replace(/\s+/g, ''))) {
            errors.phone = "Sorry, our services are only available within Sri Lanka (+94)";
        } else if (!/^(?:0|\+94)\d{9}$/.test(phone.replace(/\s+/g, ''))) {
            errors.phone = "Must be a valid Sri Lankan number (e.g. 071... or +9471...)";
        }

        if (secondaryPhone) {
            if (/^\+(?!94)/.test(secondaryPhone.replace(/\s+/g, ''))) {
                errors.secondaryPhone = "Sorry, our services are only available within Sri Lanka (+94)";
            } else if (!/^(?:0|\+94)\d{9}$/.test(secondaryPhone.replace(/\s+/g, ''))) {
                errors.secondaryPhone = "Must be a valid Sri Lankan number";
            }
        }

        if (!district) errors.district = "District is required";
        if (!city) errors.city = "City is required";
        if (!houseNumber) errors.houseNumber = "House Number is required";
        if (!laneStreet) errors.laneStreet = "Lane/Street is required";
        if (!agreeTerms) errors.agreeTerms = "Please accept the terms and conditions";

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            // Scroll to top to show errors if needed
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setFormErrors({});
        setIsLoading(true);
        setPaymentError(null); // Reset error on new attempt

        // Profile address update logic (non-blocking)
        if (orderData.saveAddressToProfile && currentUser) {
            const role = sessionStorage.getItem("userRole");
            let collectionName = "users"; // default to customers
            if (role === "supplier") collectionName = "suppliers";
            else if (role === "pharmacist") collectionName = "pharmacists";
            else if (role === "admin") collectionName = "admins";

            const fullAddress = [orderData.houseNumber, orderData.laneStreet, orderData.city, orderData.district]
                .filter(Boolean)
                .join(', ');

            // Fire and forget, don't await this so it doesn't block checkout
            updateDoc(doc(db, collectionName, currentUser.uid), {
                district: orderData.district,
                city: orderData.city,
                houseNumber: orderData.houseNumber,
                laneStreet: orderData.laneStreet,
                address: fullAddress
            }).then(() => console.log("Profile address updated successfully!"))
              .catch(err => console.error("Failed to update profile address:", err));
        }

        if (orderData.paymentMethod === 'ONLINE') {
            const tempOrderId = `MCX${Date.now()}`;
            try {
                const authHeaders = await getAuthHeaders();
                const response = await fetch(`${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api/customer-orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
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

    const processOnlinePayment = async (orderId) => {
        // Save form state so it is not lost after redirect
        sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData));
        sessionStorage.setItem('pendingRxId', rxId || 'null');
        sessionStorage.setItem('pendingRxAmount', rxAmount || '0');

        sessionStorage.setItem('pendingCartItems', JSON.stringify(items));

        try {
            // Fetch secure hash, merchant ID, and the TRUE AMOUNT from backend
            const hashRes = await fetch(`${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api/customer-orders/generate-hash?orderId=${orderId}&amount=${PAYMENT_GATEWAY_CONFIG.TOTAL_AMOUNT}&currency=${PAYMENT_GATEWAY_CONFIG.CURRENCY}`);
            if (!hashRes.ok) throw new Error("Could not fetch payment hash");
            
            const { hash, merchantId, actualAmount } = await hashRes.json();

            const returnUrl = `${window.location.origin}${window.location.pathname}?payment_status=success&order_id=${orderId}`;
            const cancelUrl = `${window.location.origin}${window.location.pathname}?payment_status=cancel&order_id=${orderId}`;

            const form = document.createElement("form");
            form.setAttribute("method", "POST");
            form.setAttribute("action", "https://sandbox.payhere.lk/pay/checkout");

            const params = {
                merchant_id: merchantId,
                return_url: returnUrl,
                cancel_url: cancelUrl,
                notify_url: PAYMENT_GATEWAY_CONFIG.NOTIFY_URL,
                order_id: orderId,
                items: "MediCareX Medicine Order",
                currency: PAYMENT_GATEWAY_CONFIG.CURRENCY,
                amount: actualAmount, // SECURITY FIX: Use the actual amount from DB, not frontend config
                first_name: orderData.firstName,
                last_name: orderData.lastName,
                email: orderData.email,
                phone: orderData.phone,
                address: `${orderData.houseNumber}, ${orderData.laneStreet}`,
                city: orderData.city,
                country: "Sri Lanka",
                hash: hash
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
        } catch (err) {
            console.error("Payment setup error:", err);
            setIsLoading(false);
            setPaymentError("Could not initialize payment gateway.");
        }
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

                const authHeaders = await getAuthHeaders();
                const response = await fetch(`${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api/customer-orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
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
                        const { doc, getDoc } = await import('firebase/firestore');
                        
                        // Just fetch items to pass to success page, DB updates are handled by backend
                        const rxRef = doc(db, 'prescriptions', currentRxId);
                        const rxSnap = await getDoc(rxRef);
                        const rxData = rxSnap.exists() ? rxSnap.data() : null;

                        if (rxData) {
                            orderItemsForSuccess = rxData.orderItems || rxData.medications || [];
                        }
                    } catch (err) {
                        console.error("Error fetching prescription items for success page:", err);
                    }
                } else {
                    orderItemsForSuccess = items.map(item => ({
                        name: item.name,
                        price: item.price,
                        qty: item.qty
                    }));
                }

                isSuccessNavigating.current = true;
                if (shouldClearCart && !currentRxId) clearCart();
                navigate(`/customer/checkout/success?orderId=${referenceId}`, {
                    replace: true,
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
        <div className="min-h-screen" style={{ background: '#f1f5f9', fontFamily: FONT.body }}>

            <main className="max-w-7xl mx-auto px-6 py-8 pb-20">
                <header className="mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Secure Payment</p>
                    <h1 className="text-2xl font-black text-slate-900">Checkout</h1>
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
                            originalProfileAddress={originalProfileAddress}
                            errors={formErrors}
                            isLoading={isLoading}
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
                            errors={formErrors}
                        />

                    </aside>
                </div>
            </main>
        </div>
    );
};

export default Checkout;