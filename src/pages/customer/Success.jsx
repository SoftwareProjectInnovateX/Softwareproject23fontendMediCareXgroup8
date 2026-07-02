import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; 
import { CheckCircle, Download, AlertCircle, HeartPulse } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const UI_SETTINGS = {
    ICON_SIZE: 80,
    HOME_PATH: "/"
};

const SUCCESS_MESSAGES = {
    TITLE: "Order Successful!",
    BODY: "Your order has been placed successfully. We will send you a confirmation email shortly."
};

const Success = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const urlOrderId = queryParams.get('orderId');

    const [orderData, setOrderData] = useState(location.state?.orderData || null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!urlOrderId && !orderData) {
                setIsLoading(false);
                return;
            }
            if (!urlOrderId) {
                setIsLoading(false);
                return;
            }
            try {
                const res = await fetch(`http://localhost:5000/api/customer-orders/details/${urlOrderId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setOrderData({
                            orderId: data.orderId,
                            totalAmount: data.totalAmount,
                            firstName: data.customerName?.split(' ')[0] || '',
                            lastName: data.customerName?.split(' ').slice(1).join(' ') || '',
                            houseNumber: data.address?.split(',')[0] || '',
                            laneStreet: data.address?.split(',').slice(1, -1).join(',') || '',
                            city: data.address?.split(',').slice(-1)[0] || '',
                            phone: data.phone,
                            email: data.email,
                            items: data.types || [],
                            paymentMethod: data.paymentMethod || 'online',
                            paymentStatus: data.paymentStatus || 'pending'
                        });
                    }
                } else {
                    if (!orderData) setFetchError("Could not verify order details from the server.");
                }
            } catch (err) {
                if (!orderData) setFetchError("Network error while verifying order.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [urlOrderId]);

    const displayData = orderData || { 
        orderId: urlOrderId || 'N/A', 
        totalAmount: 0,
        firstName: 'Customer',
        items: [],
        paymentMethod: 'online'
    };

    const displayAmount = displayData.totalAmount;
    const isCOD = String(displayData.paymentMethod).toUpperCase() === 'COD';

    const downloadPDF = async () => {
        const input = document.getElementById('invoice-download');
        if (!input) return;

        try {
            const canvas = await html2canvas(input, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`MediCareX_Invoice_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Error:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (fetchError && !orderData) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-lg text-center flex flex-col items-center">
                    <AlertCircle size={60} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Information Unavailable</h2>
                    <p className="text-slate-500 mb-8">{fetchError}</p>
                    <Link to="/customer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
            <main className="max-w-md w-full bg-white p-10 rounded-3xl shadow-lg text-center">

                {/* === ON-SCREEN UI === */}
                <div style={{ padding: '20px', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <CheckCircle size={60} color="#22c55e" style={{ margin: '0 auto' }} />
                        <h2 style={{ color: '#1e3a8a', fontSize: '24px', marginTop: '16px', fontWeight: 'bold' }}>Order Successful!</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                            {isCOD ? "Your order has been placed successfully. Please pay at the time of delivery." : "Your payment was processed successfully."}
                        </p>
                        <p style={{ color: '#0f172a', fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>Order #{displayData.orderId}</p>
                    </div>
                </div>

                {/* === OFF-SCREEN A4 PDF TEMPLATE === */}
                <div 
                    id="invoice-download" 
                    style={{ 
                        position: 'fixed', 
                        top: '-9999px', 
                        left: '-9999px',
                        width: '794px', 
                        height: '1123px', 
                        backgroundColor: '#ffffff', 
                        padding: '60px 60px 40px 60px', 
                        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                        color: '#0f172a',
                        boxSizing: 'border-box',
                        textAlign: 'left'
                    }}
                >
                    {/* PAID Watermark */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-45deg)',
                        fontSize: isCOD ? '110px' : '140px',
                        fontWeight: '900',
                        color: isCOD ? 'rgba(15, 23, 42, 0.05)' : 'rgba(22, 163, 74, 0.05)',
                        zIndex: 0,
                        pointerEvents: 'none',
                        letterSpacing: isCOD ? '10px' : '20px',
                        whiteSpace: 'nowrap'
                    }}>
                        {isCOD ? 'CASH ON DELIVERY' : 'PAID ONLINE'}
                    </div>

                    {/* Header: Invoice Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e3a8a', paddingBottom: '30px', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                        <div>
                            <div style={{ marginBottom: '12px' }}>
                                <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '36px', fontWeight: '900', letterSpacing: '-1px' }}>MediCareX</h1>
                            </div>
                            <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: '14px' }}>Your Smart Pharmacy Solution</p>
                            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>Colombo, Sri Lanka</p>
                            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>contact@medicarex.lk | +94 112 345 678</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ color: '#0f172a', margin: 0, fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Invoice</h2>
                            <table style={{ marginTop: '16px', fontSize: '14px', marginLeft: 'auto', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ color: '#64748b', paddingBottom: '8px', paddingRight: '24px' }}>Invoice No:</td>
                                        <td style={{ paddingBottom: '8px' }}><strong style={{ color: '#1e3a8a' }}>#{displayData.orderId}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', paddingBottom: '8px', paddingRight: '24px' }}>Date:</td>
                                        <td style={{ paddingBottom: '8px' }}><strong>{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', paddingBottom: '8px', paddingRight: '24px' }}>Gateway:</td>
                                        <td style={{ paddingBottom: '8px' }}><strong>{isCOD ? 'Cash on Delivery' : 'PayHere Secure'}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style={{ color: '#64748b', paddingBottom: '0', paddingRight: '24px' }}>Status:</td>
                                        <td style={{ paddingBottom: '0' }}><span style={{ color: isCOD ? '#ea580c' : '#16a34a', fontWeight: 'bold' }}>{isCOD ? 'UNPAID' : 'PAID'}</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bill To Section */}
                    <div style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: '16px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'inline-block' }}>Bill To</h3>
                        <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>{displayData.firstName} {displayData.lastName}</p>
                        {displayData.houseNumber || displayData.laneStreet ? (
                            <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>
                                {displayData.houseNumber}{displayData.houseNumber && displayData.laneStreet ? ', ' : ''}{displayData.laneStreet}
                            </p>
                        ) : null}
                        {displayData.city ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>{displayData.city}</p> : null}
                        {displayData.phone ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Tel: {displayData.phone}</p> : null}
                        {displayData.email ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Email: {displayData.email}</p> : null}
                    </div>

                    {/* Order Details Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', width: '70%' }}>Description</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', width: '30%' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.items && displayData.items.length > 0 ? (
                                displayData.items.map((item, idx) => {
                                    const q = item.qty || item.quantity || 1;
                                    const p = item.price || (item.total / q) || 0;
                                    const itemTotal = p * q;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px', fontSize: '15px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>{item.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', color: '#64748b' }}>QTY: {q}</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>× Rs. {p.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>
                                                Rs. {itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px 16px', fontSize: '16px', color: '#334155' }}>Medicine Order Items & Services</td>
                                    <td style={{ padding: '20px 16px', textAlign: 'right', fontSize: '16px', color: '#0f172a', fontWeight: '500' }}>
                                        Rs. {(displayAmount - 400).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>Subtotal</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#334155', fontWeight: 'bold' }}>
                                    Rs. {(displayAmount - 400).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#059669', fontWeight: 'bold' }}>
                                    Shipping Charge
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#059669', fontWeight: 'bold' }}>
                                    Rs. 400.00
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>Tax (0%)</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#334155', fontWeight: 'bold' }}>
                                    Rs. 0.00
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: '#0f172a', borderTop: '2px solid #e2e8f0' }}>Total Amount</td>
                                <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '24px', fontWeight: '900', color: '#1e3a8a', borderTop: '2px solid #e2e8f0' }}>
                                    Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Terms and Conditions */}
                    <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
                        <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Terms & Conditions</h4>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>1. Medicines once sold cannot be returned or exchanged due to health and safety regulations.</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>2. All prices shown are inclusive of applicable taxes.</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>3. For support or discrepancies, please contact us within 24 hours of delivery.</p>
                    </div>

                    {/* Thank You Note */}
                    <div style={{ paddingTop: '40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <p style={{ fontSize: '18px', color: '#1e3a8a', fontWeight: 'bold', marginBottom: '8px' }}>Thank You for Your Business!</p>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>If you have any questions concerning this invoice, please contact our support team.</p>
                    </div>

                    {/* Footer */}
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', marginTop: '60px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', position: 'relative', zIndex: 1 }}>
                        <p style={{ margin: 0 }}>Generated automatically by MediCareX System</p>
                        <p style={{ margin: 0 }}>Page 1 of 1</p>
                    </div>
                </div>

                <button
                    onClick={downloadPDF}
                    className="flex items-center justify-center gap-2 w-full mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all"
                >
                    <Download size={20} />
                    Download PDF Invoice
                </button>

                <Link to="/customer" className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl">
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default Success;