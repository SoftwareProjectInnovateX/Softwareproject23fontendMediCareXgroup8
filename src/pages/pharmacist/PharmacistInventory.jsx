import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  RefreshCw,
  Shield,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getInventory } from '../../services/pharmacistService';

const PAGE_SIZE = 20;

const PharmacistInventory = () => {
  const [allItems, setAllItems]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab]   = useState('all'); // 'all' | 'low' | 'critical'
  const [page, setPage]             = useState(1);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const inv = await getInventory();
      setAllItems(inv || []);
    } catch (e) {
      console.error('Inventory fetch error:', e);
      setError('Failed to load inventory. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getStock = (item) =>
    Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0);

  const getPrice = (item) =>
    Number(item.price ?? item.unitPrice ?? item.sellingPrice ?? 0);

  // ── computed lists ────────────────────────────────────────────────────────────
  const lowStockItems      = useMemo(() => allItems.filter(i => getStock(i) < 100), [allItems]);
  const criticalStockItems = useMemo(() => allItems.filter(i => getStock(i) < 20),  [allItems]);

  const baseList = activeTab === 'critical' ? criticalStockItems
                 : activeTab === 'low'      ? lowStockItems
                 : allItems;

  const filtered = useMemo(() =>
    baseList.filter(item => {
      const q = searchTerm.toLowerCase();
      return (
        (item.name  || '').toLowerCase().includes(q) ||
        (item.sku   || '').toLowerCase().includes(q) ||
        (item.batch || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }),
    [baseList, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => setPage(1), [searchTerm, activeTab]);

  // ── stock bar ─────────────────────────────────────────────────────────────────
  const StockBar = ({ qty }) => {
    const pct      = Math.min((qty / 200) * 100, 100);
    const color    = qty < 20 ? 'bg-red-500' : qty < 100 ? 'bg-orange-400' : 'bg-emerald-500';
    const textClr  = qty < 20 ? 'text-red-600' : qty < 100 ? 'text-orange-500' : 'text-slate-800';
    return (
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`font-bold text-sm ${textClr}`}>{qty}</span>
        {qty < 20 && <span className="text-[10px] font-bold text-red-500 uppercase">Critical</span>}
        {qty >= 20 && qty < 100 && <span className="text-[10px] font-bold text-orange-500 uppercase">Low</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Inventory</h1>
          {!isLoading && !error && (
            <p className="text-slate-400 text-sm mt-1">
              {allItems.length} products &nbsp;·&nbsp;
              <span className="text-orange-500 font-semibold">{lowStockItems.length} low stock</span>&nbsp;·&nbsp;
              <span className="text-red-500 font-semibold">{criticalStockItems.length} critical</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, batch or category…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => { setIsLoading(true); loadInventory(); }}
            className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-0 -mt-2">
        {[
          { key: 'all',      label: 'All Items',    count: allItems.length,          color: 'blue'   },
          { key: 'low',      label: 'Low Stock',    count: lowStockItems.length,      color: 'orange' },
          { key: 'critical', label: 'Critical',     count: criticalStockItems.length, color: 'red'    },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${
              activeTab === tab.key
                ? `border-${tab.color}-600 text-slate-800`
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key
                ? `bg-${tab.color}-600 text-white`
                : `bg-${tab.color}-100 text-${tab.color}-600`
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" />
          <p className="font-medium">Loading inventory from backend…</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="font-bold text-red-600">{error}</p>
          <button onClick={loadInventory} className="mt-4 px-5 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden shadow-sm border border-slate-200 rounded-xl">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Product Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">SKU / Batch</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Available Stock</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-slate-400 text-sm font-medium">
                    {searchTerm ? 'No items match your search.' : 'No inventory items found.'}
                  </td>
                </tr>
              ) : paginated.map((item, idx) => {
                const qty = getStock(item);
                const price = getPrice(item);
                const isControlled = item.controlled || item.isControlled || false;
                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isControlled
                          ? <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          : <Package className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        }
                        <div>
                          <div className="font-bold text-slate-800">{item.name || 'Unknown'}</div>
                          {item.dosage && (
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.dosage}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] font-mono text-slate-500 font-bold">{item.sku || '—'}</div>
                      {item.batch && <div className="text-[10px] text-slate-400 mt-0.5">Batch: {item.batch}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StockBar qty={qty} />
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {price > 0 ? `Rs. ${price.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50/30">
            <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacistInventory;
