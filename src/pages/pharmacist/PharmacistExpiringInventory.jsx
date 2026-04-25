import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, AlertTriangle, Calendar, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistExpiringInventory = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [expiringMedicines, setExpiringMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    import('../../services/pharmacistService').then(({ getInventory }) => {
       getInventory().then((inv) => {
         const today = new Date();
         today.setHours(0, 0, 0, 0);

         const inFewWeeks = new Date(today);
         inFewWeeks.setDate(inFewWeeks.getDate() + 30);
         
         const expiringList = inv.filter(item => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            if (!dateStr) return false;
            const expDate = new Date(dateStr);
            return expDate <= inFewWeeks;
         }).map((item, idx) => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            const expDate = new Date(dateStr);
            expDate.setHours(0, 0, 0, 0);
            const isExpired = expDate < today;
            const msDiff = expDate - today;
            const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
            
            let statusStr = '';
            if (isExpired) {
               statusStr = 'Expired';
            } else if (daysDiff === 0) {
               statusStr = 'Expiring Today';
            } else {
               statusStr = `Expiring in ${daysDiff} Days`;
            }

            return {
               id: item.id || idx,
               name: item.name || 'Unknown',
               dosage: item.dosage || 'N/A',
               totalQty: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
               status: statusStr,
               batches: [
                  {
                     batchNo: item.batch || item.sku || `B-${Math.floor(Math.random()*10000)}`,
                     qty: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
                     expiryDate: dateStr,
                     mfgDate: item.mfgDate ?? 'Unknown'
                  }
               ]
            };
         });
         setExpiringMedicines(expiringList);
         setIsLoading(false);
       }).catch(() => setIsLoading(false));
    }).catch(() => setIsLoading(false));
  }, []);

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

