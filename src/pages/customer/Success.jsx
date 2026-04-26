import React from 'react';
import { Link, useLocation } from 'react-router-dom'; 
import { CheckCircle, Download } from 'lucide-react';
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

    const orderData = location.state?.orderData || { 
        orderId: 'ORD-TEMP-001', 
        totalAmount: location.state?.totalAmount || 0,
        firstName: 'Customer'
    };

    const displayAmount = location.state?.totalAmount ?? orderData.totalAmount;

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

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
            <main className="max-w-md w-full bg-white p-10 rounded-3xl shadow-lg text-center">

                {/* === ON-SCREEN UI === */}
                <div style={{ padding: '20px', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}>
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <CheckCircle size={60} color="#22c55e" style={{ margin: '0 auto' }} />
                        <h2 style={{ color: '#1e3a8a', fontSize: '24px', marginTop: '16px', fontWeight: 'bold' }}>Order Successful!</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>Your payment was processed successfully.</p>
                        <p style={{ color: '#0f172a', fontSize: '16px', marginTop: '8px', fontWeight: '600' }}>Order #{orderData.orderId}</p>
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
                        padding: '60px', 
                        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                        color: '#0f172a',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header: Logo and Invoice Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e3a8a', paddingBottom: '30px', marginBottom: '40px' }}>
                        <div>
                            <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '36px', fontWeight: '900', letterSpacing: '-1px' }}>MediCareX</h1>
                            <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: '14px' }}>Your Smart Pharmacy Solution</p>
                            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>Colombo, Sri Lanka</p>
                            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>contact@medicarex.lk | +94 112 345 678</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ color: '#0f172a', margin: 0, fontSize: '28px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Invoice</h2>
                            <div style={{ marginTop: '16px', fontSize: '14px' }}>
                                <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b', display: 'inline-block', width: '80px', textAlign: 'left' }}>Invoice No:</span> <strong style={{ color: '#1e3a8a' }}>#{orderData.orderId}</strong></p>
                                <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b', display: 'inline-block', width: '80px', textAlign: 'left' }}>Date:</span> <strong>{new Date().toLocaleDateString('en-GB')}</strong></p>
                                <p style={{ margin: '4px 0' }}><span style={{ color: '#64748b', display: 'inline-block', width: '80px', textAlign: 'left' }}>Status:</span> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>PAID (Online)</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Bill To Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '16px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'inline-block' }}>Bill To</h3>
                        <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a' }}>{orderData.firstName} {orderData.lastName}</p>
                        {orderData.houseNumber || orderData.laneStreet ? (
                            <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>
                                {orderData.houseNumber}{orderData.houseNumber && orderData.laneStreet ? ', ' : ''}{orderData.laneStreet}
                            </p>
                        ) : null}
                        {orderData.city ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>{orderData.city}</p> : null}
                        {orderData.phone ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Tel: {orderData.phone}</p> : null}
                        {orderData.email ? <p style={{ margin: '0 0 4px', fontSize: '15px', color: '#334155' }}>Email: {orderData.email}</p> : null}
                    </div>

                    {/* Order Details Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', width: '70%' }}>Description</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', width: '30%' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderData.items && orderData.items.length > 0 ? (
                                orderData.items.map((item, idx) => {
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
                                    Shipping Charge <span style={{ fontSize: '10px', background: '#d1fae5', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>FLAT RATE</span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#059669', fontWeight: 'bold' }}>
                                    Rs. 400.00
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Total Amount</td>
                                <td style={{ padding: '24px 16px', textAlign: 'right', fontSize: '24px', fontWeight: '900', color: '#1e3a8a' }}>
                                    Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Thank You Note */}
                    <div style={{ marginTop: 'auto', paddingTop: '60px', textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', color: '#1e3a8a', fontWeight: 'bold', marginBottom: '8px' }}>Thank You for Your Business!</p>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>If you have any questions concerning this invoice, please contact our support team.</p>
                    </div>

                    {/* Footer */}
                    <div style={{ position: 'absolute', bottom: '60px', left: '60px', right: '60px', borderTop: '2px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
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