import React, { useState } from 'react';
import { Plus, Trash2, Printer, ArrowLeft, CheckCircle2, User, Search, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistNewRxEntry = () => {
  const navigate = useNavigate();
  
  // Form State
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Medicine List State
  const [medicines, setMedicines] = useState([]);
  const [currentMed, setCurrentMed] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [activeTab, setActiveTab] = useState('rx'); // 'rx' or 'otc'
  
  const [isBillGenerated, setIsBillGenerated] = useState(false);

  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (currentMed && currentQty && currentPrice) {
      setMedicines([...medicines, {
        id: Date.now(),
        name: currentMed,
        category: activeTab,
        qty: parseInt(currentQty),
        price: parseFloat(currentPrice),
        total: parseInt(currentQty) * parseFloat(currentPrice)
      }]);
      setCurrentMed('');
      setCurrentQty('');
      setCurrentPrice('');
    }
  };

  const removeMedicine = (id) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const grandTotal = medicines.reduce((sum, item) => sum + item.total, 0);

  const handleGenerateBill = () => {
    if (patientName && medicines.length > 0) {
      setIsBillGenerated(true);
    } else {
      alert("Please enter patient details and at least one medicine.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* PharmacistHeader */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 ">Walk-in POS & Billing</h1>
            <p className="text-slate-500 mt-1">Manual entry for prescriptions and in-store purchases</p>
          </div>
        </div>
        
        {isBillGenerated && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-emerald-200 ">
            <CheckCircle2 className="w-5 h-5" />
            Bill Generated Successfully
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Data Entry */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Details */}
          <div className="card ">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Patient Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isBillGenerated}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07X XXX XXXX"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isBillGenerated}
                />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="card ">
            <div className="flex border-b border-slate-200 mb-6 gap-6">
               <button 
                 type="button"
                 className={`pb-3 font-bold text-sm transition-colors border-b-2 outline-none ${activeTab === 'rx' ? 'text-blue-600 border-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 onClick={() => setActiveTab('rx')}
               >
                 Prescribed Medicines
               </button>
               <button 
                 type="button"
                 className={`pb-3 font-bold text-sm transition-colors border-b-2 outline-none ${activeTab === 'otc' ? 'text-emerald-600 border-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                 onClick={() => setActiveTab('otc')}
               >
                 OTC & General Items
               </button>
            </div>
            
            {!isBillGenerated && (
              <form onSubmit={handleAddMedicine} className={`flex gap-3 mb-6 items-end p-4 rounded-xl border ${activeTab === 'rx' ? 'bg-blue-50/50 border-blue-100 ' : 'bg-emerald-50/50 border-emerald-100 '}`}>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    {activeTab === 'rx' ? 'Medicine Name' : 'Item Name (e.g. Shampoo)'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={currentMed}
                      onChange={(e) => setCurrentMed(e.target.value)}
                      placeholder="Search and type..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 "
                      required
                    />
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Qty</label>
                  <input 
                    type="number" 
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 "
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 "
                    required
                  />
                </div>
                <button type="submit" className={`${activeTab === 'rx' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 h-[38px] transition-colors`}>
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>
            )}

            {/* Added Medicines List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 ">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price / Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                    {!isBillGenerated && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white ">
                  {medicines.length === 0 ? (
                    <tr>
                      <td colSpan={isBillGenerated ? 4 : 5} className="px-4 py-8 text-center text-slate-400">
                        No medicines added yet.
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 flex items-center gap-2">
                          {med.name}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${med.category === 'rx' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {med.category === 'rx' ? 'Rx' : 'OTC'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center bg-slate-50/50 ">{med.qty}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">${med.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">${med.total.toFixed(2)}</td>
                        {!isBillGenerated && (
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => removeMedicine(med.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>

        {/* Right Column: Billing Summary */}
        <div className="space-y-6">
          <div className="card sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Billing Summary</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal ({medicines.length} items)</span>
                <span className="font-medium ">${grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax / Fee (0%)</span>
                <span className="font-medium text-slate-400">$0.00</span>
              </div>
              <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                <span className="text-base font-bold text-slate-800 ">Grand Total</span>
                <span className="text-2xl font-bold text-blue-600 ">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {!isBillGenerated ? (
              <button 
                onClick={handleGenerateBill}
                className={`w-full py-3.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                  medicines.length > 0 && patientName 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FileText className="w-5 h-5" />
                Generate Final Bill
              </button>
            ) : (
              <div className="space-y-3">
                <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                  <Printer className="w-5 h-5" />
                  Print Receipt
                </button>
                <button 
                  onClick={() => {
                    setIsBillGenerated(false);
                    setMedicines([]);
                    setPatientName('');
                    setPhone('');
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Start New Entry
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default PharmacistNewRxEntry;

