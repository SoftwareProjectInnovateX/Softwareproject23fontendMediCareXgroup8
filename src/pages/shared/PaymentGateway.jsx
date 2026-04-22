import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const PaymentGateway = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [recordInfo, setRecordInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card Payment');

  useEffect(() => {
    const fetchBill = async () => {
       try {
          const docRef = doc(db, 'pharmacistDispensed', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             setRecordInfo(docSnap.data());
          } else {
             setErrorMsg("Payment link invalid or expired.");
          }
       } catch (e) {
          setErrorMsg("Network error reading payment info.");
       }
       setLoading(false);
    };
    
    if (id) fetchBill();
  }, [id]);

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    // Simulate gateway delay
    await new Promise(r => setTimeout(r, 2000));
    
    try {
       const docRef = doc(db, 'pharmacistDispensed', id);
       await updateDoc(docRef, { 
           paymentStatus: 'Paid',
           paymentMethod: paymentMethod
       });
       
       setSuccess(true);
       setTimeout(() => navigate('/pharmacist/dispensing'), 1500); // Redirect back to dispensing
    } catch(e) {
       console.error("Payment sync failed:", e);
       setErrorMsg("Failed to update status on server.");
    }
    setProcessing(false);
  };

  if (loading) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
       </div>
    );
  }

  if (errorMsg) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
             <p className="text-slate-500">{errorMsg}</p>
          </div>
       </div>
    );
  }

  if (success) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center max-w-md w-full animate-in zoom-in-95 duration-500">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle className="w-12 h-12" />
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h2>
             <p className="text-slate-500 mb-8">Your transaction for Rs. {recordInfo?.total?.toFixed(2)} was processed successfully.</p>
             <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-left text-sm">
                <div className="flex justify-between mb-2 pb-2 border-b border-slate-200">
                   <span className="text-slate-400 font-bold">Transaction ID</span>
                   <span className="text-slate-800 font-medium">#TX-{Math.floor(Math.random()*9000000)}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-slate-400 font-bold">Date</span>
                   <span className="text-slate-800 font-medium">{new Date().toLocaleString()}</span>
                </div>
             </div>
             <p className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Dispensing Queue...
             </p>
          </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[900px] flex overflow-hidden">
         {/* Left Side: Order Summary */}
         <div className="w-full md:w-2/5 md:bg-slate-50 p-8 border-r border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Secure Checkout
            </h2>
            <div className="mb-8">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Total</p>
               <h1 className="text-4xl font-black text-slate-800">Rs. {recordInfo?.total?.toFixed(2)}</h1>
            </div>

            <div className="space-y-4">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Patient</p>
                  <p className="text-sm font-semibold text-slate-700">{recordInfo?.verifiedPatient}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Order ID</p>
                  <p className="text-sm font-semibold text-slate-700">#RX-{recordInfo?.rxId}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
                  <p className="text-sm font-semibold text-slate-700">{recordInfo?.dispensedDate}</p>
               </div>
            </div>
         </div>

         {/* Right Side: Payment Form */}
         <div className="w-full md:w-3/5 p-8 bg-white flex flex-col justify-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-medium">Payment Authorization</h3>
            <p className="text-sm text-slate-500 mb-8">Click the button below to authorize and process this payment simulation.</p>
            
            <form onSubmit={handlePay} className="space-y-5">
               
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Payment Method</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Card Payment">Credit / Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="PayHere">PayHere Gateway</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
               </div>

               {paymentMethod === 'Card Payment' && (
                 <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-blue-500" />
                    <div>
                       <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Test Card Linked</p>
                       <p className="text-sm font-medium text-blue-600">•••• •••• •••• 4242</p>
                    </div>
                 </div>
               )}

               {paymentMethod === 'Bank Transfer' && (
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Bank Details for Transfer</p>
                    <p className="text-sm font-medium text-indigo-600">Acct: 1029384756 • Bank: BOC • Branch: City Center</p>
                 </div>
               )}

               {paymentMethod === 'PayHere' && (
                 <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-xl flex items-center justify-center">
                    <p className="text-sm font-bold text-cyan-800 tracking-wider">PayHere Secure Checkout</p>
                 </div>
               )}

               {paymentMethod === 'COD' && (
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-full">
                       <CheckCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Confirm COD Order</p>
                       <p className="text-sm font-medium text-amber-600">Pay cash directly to the rider upon delivery.</p>
                    </div>
                 </div>
               )}

               <button 
                  type="submit" 
                  disabled={processing}
                  className="w-full py-4 mt-4 bg-[#0a2540] hover:bg-[#00172e] text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
               >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay Now'}
               </button>
            </form>
         </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
