import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, AlertCircle, AlertTriangle, Plus, PackagePlus, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getInventory, updateInventoryItem } from '../../services/pharmacistService';

const PharmacistLowStock = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('critical'); // 'critical' (< 20) | 'low' (< 100)

  const [allInventory, setAllInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInventory = useCallback(async () => {
    try {
      const inv = await getInventory();
      setAllInventory(inv);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Items with qty < 100 (low stock)
  const lowStockMeds = allInventory
    .filter(item => {
      const qty = Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0);
      return qty < 100;
    })
    .map(item => ({
      id: item.id,
      // Handle all possible name fields from different inventory schemas
      name: item.name || item.productName || item.itemName || item.medicineName || item.drugName || 'Unknown Item',
      category: item.category || item.type || '',
      dosage: item.dosage || item.strength || item.unit || 'N/A',
      batch: item.batch || item.batchNo || item.sku || `B-${(item.id || '0000').toString().slice(-4)}`,
      price: item.retailPrice || item.price || item.unitPrice || item.sellingPrice || 0,
      currentStock: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
      minLevel: Number(item.threshold ?? item.minLevel ?? item.reorderLevel ?? 50),
      _raw: item,
    }))
    .sort((a, b) => a.currentStock - b.currentStock); // Most critical first

  // Items with qty < 20 (critical)
  const criticalMeds = lowStockMeds.filter(m => m.currentStock < 20);

  const displayMeds = (activeTab === 'critical' ? criticalMeds : lowStockMeds).filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRestockClick = (id) => {
    setSelectedMedId(id === selectedMedId ? null : id);
    setAddQuantity('');
    setSuccessMessage('');
  };

  const handleAddStock = async (e, med) => {
    e.preventDefault();
    const qty = Number(addQuantity);
    if (!qty || qty <= 0) return;

    setIsAdding(true);
    try {
      const newQty = med.currentStock + qty;
      // Update all known stock fields to ensure backend picks it up
      const updatePayload = { stock: newQty, qty: newQty, quantity: newQty };
      // Also preserve whichever field was the original
      const stockKey = med._raw.stock !== undefined ? 'stock'
        : med._raw.qty !== undefined ? 'qty'
        : med._raw.quantity !== undefined ? 'quantity'
        : med._raw.totalStock !== undefined ? 'totalStock'
        : 'currentStock';
      updatePayload[stockKey] = newQty;

      await updateInventoryItem(med.id, updatePayload);

      // Update local state immediately
      setAllInventory(prev =>
        prev.map(item =>
          item.id === med.id ? { ...item, ...updatePayload } : item
        )
      );

      // Notify dashboard to refresh its inventory counts
      window.dispatchEvent(new Event('inventory_updated'));

      setSuccessMessage(`✅ Stock updated: ${med.currentStock} → ${newQty}`);
      setTimeout(() => {
        setSuccessMessage('');
        setSelectedMedId(null);
        setAddQuantity('');
        loadInventory(); // Re-fetch to fully sync with backend
      }, 2000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      setSuccessMessage('❌ Update failed — check backend connection.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Low Stock Inventory
          </h1>
          <p className="text-slate-500 mt-1">Review items below capacity and restock from here.</p>
        </div>
        <button
          onClick={() => { setIsLoading(true); loadInventory(); }}
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs + Stats */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setActiveTab('critical'); setSelectedMedId(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
            activeTab === 'critical'
              ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200'
              : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Critical (&lt; 20)
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black ${
            activeTab === 'critical' ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'
          }`}>
            {criticalMeds.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('low'); setSelectedMedId(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
            activeTab === 'low'
              ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200'
              : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Low Stock (&lt; 100)
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black ${
            activeTab === 'low' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-600'
          }`}>
            {lowStockMeds.length}
          </span>
        </button>

        <div className="ml-auto relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or batch..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-orange-400" />
          <p className="font-medium">Loading inventory...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayMeds.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="text-slate-500 font-medium">
                {searchTerm ? 'No items match your search.' : activeTab === 'critical' ? 'No critical stock items! 🎉' : 'All items are well-stocked!'}
              </p>
            </div>
          ) : (
            displayMeds.map((med) => {
              const isCritical = med.currentStock < 20;
              const isSelected = selectedMedId === med.id;
              const stockPct = Math.min((med.currentStock / 100) * 100, 100);

              return (
                <div
                  key={med.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm ${
                    isSelected
                      ? 'border-blue-300 ring-2 ring-blue-500/20 shadow-md'
                      : isCritical
                        ? 'border-red-200 hover:border-red-300 hover:shadow-md'
                        : 'border-orange-100 hover:border-orange-300 hover:shadow-md'
                  }`}
                >
                  {/* Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Stock badge */}
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black text-xl ${
                      isCritical ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                    }`}>
                      {med.currentStock}
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-60">units</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800 truncate">{med.name}</h3>
                        {med.dosage !== 'N/A' && (
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-slate-200 flex-shrink-0">
                            {med.dosage}
                          </span>
                        )}
                        {isCritical && (
                          <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200 flex-shrink-0 uppercase tracking-wide">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Batch: <span className="text-slate-600 font-semibold">{med.batch}</span></p>
                      {/* Mini stock bar */}
                      <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isCritical ? 'bg-red-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {med.currentStock} / 100 units &nbsp;·&nbsp; Min level: {med.minLevel}
                      </p>
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => handleRestockClick(med.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        isSelected
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
                      }`}
                    >
                      <PackagePlus className="w-4 h-4" />
                      {isSelected ? 'Cancel' : 'Add Stock'}
                    </button>
                  </div>

                  {/* Add stock form (expansion) */}
                  {isSelected && (
                    <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 animate-in slide-in-from-top-1">
                      {successMessage ? (
                        <div className={`flex items-center justify-center gap-2 py-2 font-bold text-sm ${
                          successMessage.startsWith('❌') ? 'text-red-500' : 'text-emerald-600'
                        }`}>
                          {!successMessage.startsWith('❌') && <CheckCircle2 className="w-5 h-5" />}
                          {successMessage}
                        </div>
                      ) : (
                        <form onSubmit={e => handleAddStock(e, med)} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                              Quantity to Add
                            </label>
                            <input
                              type="number"
                              value={addQuantity}
                              onChange={e => setAddQuantity(e.target.value)}
                              placeholder="e.g. 50"
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                              required
                              autoFocus
                            />
                          </div>
                          <div className="text-sm text-slate-500 pb-2.5">
                            Current: <span className="font-bold text-slate-800">{med.currentStock}</span>
                            {addQuantity && Number(addQuantity) > 0 && (
                              <span className="text-emerald-600 font-bold ml-2">→ {med.currentStock + Number(addQuantity)}</span>
                            )}
                          </div>
                          <button
                            type="submit"
                            disabled={isAdding}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
                          >
                            {isAdding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {isAdding ? 'Saving...' : 'Confirm'}
                          </button>
                        </form>
                      )}
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

export default PharmacistLowStock;
