import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, AlertTriangle, Calendar, Package, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getInventory } from '../../services/pharmacistService';

const PharmacistExpiringInventory = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expiringMedicines, setExpiringMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const inv = await getInventory();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 7-day window
        const inOneWeek = new Date(today);
        inOneWeek.setDate(inOneWeek.getDate() + 7);

        const expiringList = inv
          .filter(item => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            if (!dateStr) return false;
            const expDate = new Date(dateStr);
            expDate.setHours(0, 0, 0, 0);
            return expDate <= inOneWeek; // within 7 days OR already expired
          })
          .map((item, idx) => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            const expDate = new Date(dateStr);
            expDate.setHours(0, 0, 0, 0);
            const isExpired = expDate < today;
            const msDiff = expDate - today;
            const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

            let statusStr = '';
            let urgency = 0;
            if (isExpired) {
              statusStr = 'Expired';
              urgency = 0;
            } else if (daysDiff === 0) {
              statusStr = 'Expiring Today';
              urgency = 1;
            } else if (daysDiff <= 2) {
              statusStr = `Expires in ${daysDiff} Day${daysDiff > 1 ? 's' : ''}`;
              urgency = 2;
            } else {
              statusStr = `Expires in ${daysDiff} Days`;
              urgency = 3;
            }

            return {
              id: item.id || idx,
              name: item.name || 'Unknown',
              dosage: item.dosage || 'N/A',
              totalQty: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
              status: statusStr,
              isExpired,
              daysDiff,
              urgency,
              batches: [
                {
                  batchNo: item.batch || item.sku || `B-${String(item.id || idx).slice(-4)}`,
                  qty: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
                  expiryDate: dateStr,
                  mfgDate: item.mfgDate ?? item.manufacturingDate ?? 'Unknown',
                },
              ],
            };
          });

        // Sort: Expired first → then by closest expiry
        expiringList.sort((a, b) => a.urgency - b.urgency || a.daysDiff - b.daysDiff);
        setExpiringMedicines(expiringList);
      } catch (e) {
        console.error('Error loading inventory:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredMedicines = expiringMedicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.dosage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expiredCount = filteredMedicines.filter(m => m.isExpired).length;
  const soonCount = filteredMedicines.filter(m => !m.isExpired).length;

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

  const statusColor = (med) => {
    if (med.isExpired) return { badge: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500', icon: 'text-red-500', ring: 'bg-red-100' };
    if (med.daysDiff <= 2) return { badge: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500', icon: 'text-rose-500', ring: 'bg-rose-100' };
    return { badge: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400', icon: 'text-amber-500', ring: 'bg-amber-100' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
              Expiring Within 7 Days
            </h1>
            <p className="text-slate-500 mt-1">
              Medicines expiring <span className="font-bold text-red-500">within this week</span> or already expired.
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Expired</p>
              <p className="text-2xl font-black text-red-600">{expiredCount}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Expiring Soon</p>
              <p className="text-2xl font-black text-amber-600">{soonCount}</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-black text-slate-700">{filteredMedicines.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search medicine name or dosage..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400 shadow-sm"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-red-400" />
          <p className="font-medium">Loading inventory...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-400 font-medium">
                {searchTerm ? 'No items match your search.' : '✅ No items expiring within 7 days!'}
              </p>
            </div>
          ) : (
            filteredMedicines.map(med => {
              const colors = statusColor(med);
              return (
                <div
                  key={med.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                    expandedId === med.id
                      ? 'border-red-300 shadow-md ring-1 ring-red-500/20'
                      : 'border-slate-200 hover:border-red-200 hover:shadow-md'
                  }`}
                >
                  {/* Main row */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => toggleExpand(med.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.ring}`}>
                        <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800">{med.name}</h3>
                          {med.dosage !== 'N/A' && (
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                              {med.dosage}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Qty: <span className="font-bold text-slate-700">{med.totalQty}</span>
                          &nbsp;·&nbsp;
                          <span className={`font-bold ${colors.icon}`}>{med.status}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${colors.badge}`}>
                        {med.status}
                      </span>
                      <div className="text-slate-400 bg-slate-50 p-1.5 rounded-full">
                        {expandedId === med.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === med.id && (
                    <div className="bg-slate-50 p-5 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" /> Batch Details
                      </h4>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="w-full">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 text-left">Batch No.</th>
                              <th className="px-4 py-3 text-center">Qty</th>
                              <th className="px-4 py-3 text-center">Mfg Date</th>
                              <th className="px-4 py-3 text-right">Expiry Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {med.batches.map((batch, i) => (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-sm font-bold text-slate-700">{batch.batchNo}</td>
                                <td className="px-4 py-3 text-sm text-center text-slate-600 font-semibold">{batch.qty}</td>
                                <td className="px-4 py-3 text-sm text-center text-slate-500 flex items-center justify-center gap-1">
                                  <Calendar className="w-3 h-3" /> {batch.mfgDate}
                                </td>
                                <td className={`px-4 py-3 text-sm text-right font-bold ${med.isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                                  {batch.expiryDate}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                          Process Removal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PharmacistExpiringInventory;
