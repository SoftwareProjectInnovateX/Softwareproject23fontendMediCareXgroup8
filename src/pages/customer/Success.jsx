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

                <div id="invoice-download" style={{ backgroundColor: '#ffffff', padding: '40px', fontFamily: 'Arial' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px' }}>
                        <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '20px' }}>MEDICAREX</h1>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>INVOICE</p>
                            <p style={{ margin: 0, fontSize: '12px' }}>#{orderData.orderId}</p>
                        </div>
                    </div>

                    {/* Success Message */}
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        <CheckCircle size={50} color="#22c55e" style={{ margin: '0 auto' }} />
                        <h2 style={{ color: '#1e3a8a', fontSize: '18px', marginTop: '10px' }}>Order Successful!</h2>
                    </div>

                    {/* Order Details Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>Description</th>
                                <th style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '12px' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>Medicine Order Items</td>
                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '12px' }}>
                                    Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            <tr style={{ fontWeight: 'bold' }}>
                                <td style={{ padding: '10px', fontSize: '12px' }}>Total Paid</td>
                                <td style={{ padding: '10px', textAlign: 'right', color: '#1e3a8a', fontSize: '12px' }}>
                                    Rs. {Number(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div style={{ marginTop: '40px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                        <p>Thank you for choosing MediCareX!</p>
                        <p>Order Date: {new Date().toLocaleDateString()} | Status: Paid (Online) </p>
                    </div>
                </div>

                <button
                    onClick={downloadPDF}
                    className="flex items-center justify-center gap-2 w-full mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all"
                >
                    <Download size={20} />
                    Download PDF Invoice
                </button>

                <Link to="/" className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl">
                    Back to Home
                </Link>
            </main>
        </div>
    );
};

export default Success;