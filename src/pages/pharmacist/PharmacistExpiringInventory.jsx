import React, { useState } from 'react';
import { ArrowLeft, Search, AlertTriangle, Calendar, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistExpiringInventory = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Generate dates relative to today for demonstration
  const today = new Date();
  const getRelativeDate = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Mock data for expiring / expired medicines within 7 days
  const expiringMedicines = [
    { 
      id: 1, 
      name: 'Amoxicillin', 
      dosage: '500mg', 
      totalQty: 150,
      status: 'Expiring in 3 Days',
      batches: [
        { batchNo: 'B-7721', qty: 100, expiryDate: getRelativeDate(3), mfgDate: '2024-05-15' },
        { batchNo: 'B-7722', qty: 50, expiryDate: getRelativeDate(4), mfgDate: '2024-06-01' }
      ]
    },
    { 
      id: 2, 
      name: 'Metformin', 
      dosage: '850mg', 
      totalQty: 300,
      status: 'Expired',
      batches: [
        { batchNo: 'M-4429', qty: 300, expiryDate: getRelativeDate(-2), mfgDate: '2023-04-10' }
      ]
    },
    { 
      id: 3, 
      name: 'Atorvastatin', 
      dosage: '20mg', 
      totalQty: 45,
      status: 'Expiring in 6 Days',
      batches: [
        { batchNo: 'A-1102', qty: 45, expiryDate: getRelativeDate(6), mfgDate: '2023-05-20' }
      ]
    }
  ];

  const filteredMedicines = expiringMedicines.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    med.dosage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* PharmacistHeader */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Expiring & Expired PharmacistInventory
            </h1>
            <p className="text-slate-500 mt-1">Track medicines approaching expiration date or already expired.</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search medicine name or dosage..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          />
        </div>
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 font-bold flex items-center gap-2 shadow-sm">
           <Package className="w-5 h-5" />
           {filteredMedicines.length} Items Found
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {filteredMedicines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 ">
            <p className="text-slate-500 ">No medicines found matching your search.</p>
          </div>
        ) : (
          filteredMedicines.map((med) => (
            <div 
              key={med.id} 
              className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                expandedId === med.id 
                  ? 'border-red-300 shadow-md ring-1 ring-red-500/20' 
                  : 'border-slate-200 shadow-sm hover:border-red-200'
              }`}
            >
              {/* Main row (always visible) */}
              <div 
                className="p-5 flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleExpand(med.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    med.status === 'Expired' ? 'bg-red-100 text-red-600 ' : 'bg-amber-100 text-amber-600 '
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {med.name}
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-semibold border border-slate-200 ">
                        {med.dosage}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Total Impacted Quantity: <span className="font-bold text-slate-700 ">{med.totalQty}</span></p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    med.status === 'Expired' 
                      ? 'bg-red-50 text-red-600 border border-red-200 ' 
                      : 'bg-amber-50 text-amber-600 border border-amber-200 '
                  }`}>
                    {med.status}
                  </span>
                  
                  <div className="text-slate-400 bg-slate-50 p-2 rounded-full">
                    {expandedId === med.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expansion Details */}
              {expandedId === med.id && (
                <div className="bg-slate-50 p-5 border-t border-slate-100 ">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" /> Batch Details
                  </h4>
                  
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white ">
                    <table className="w-full">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 ">
                        <tr>
                          <th className="px-4 py-3 text-left">Batch Number</th>
                          <th className="px-4 py-3 text-center">Quantity</th>
                          <th className="px-4 py-3 text-center">Mfg Date</th>
                          <th className="px-4 py-3 text-right">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 ">
                        {med.batches.map((batch, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-sm font-bold text-slate-700 ">{batch.batchNo}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-600 font-semibold">{batch.qty}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-500 flex items-center justify-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {batch.mfgDate}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-red-500 ">
                              {batch.expiryDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                      Process Removal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PharmacistExpiringInventory;

