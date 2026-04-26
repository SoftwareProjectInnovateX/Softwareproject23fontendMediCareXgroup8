import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, CheckCircle, FileText, User,
  Download, RefreshCw, TrendingUp, ShoppingBag, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDispensedHistory } from '../../services/pharmacistService';

const PharmacistDispensedToday = () => {
  const navigate = useNavigate();
  const [dispensedSummary, setDispensedSummary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const allDispensed = await getDispensedHistory();
        const todayStr = new Date().toDateString();

        // Filter for today — try multiple date fields
        const todaysList = allDispensed.filter(item => {
          if (item.dispensedDate) return item.dispensedDate === todayStr;
          if (item.dispensedAt) return new Date(item.dispensedAt).toDateString() === todayStr;
          if (item.createdAt) return new Date(item.createdAt).toDateString() === todayStr;
          if (item.date) return new Date(item.date).toDateString() === todayStr;
          return false;
        });

        // Sort newest first
        todaysList.sort((a, b) => {
          const ta = a.dispensedAt || a.createdAt || a.date || '';
          const tb = b.dispensedAt || b.createdAt || b.date || '';
          return new Date(tb) - new Date(ta);
        });

        setDispensedSummary(todaysList);
      } catch (e) {
        console.error('Failed to load dispensed history:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredSummary = dispensedSummary.filter(item =>
    (item.rxId ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.verifiedPatient ?? item.patientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.patientId ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = filteredSummary.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
  const totalItemsDispensed = filteredSummary.reduce((acc, item) => acc + (item.orderItems?.length || 0), 0);
  const onlineCount = filteredSummary.filter(i => i.rxId).length;
  const physicalCount = filteredSummary.filter(i => !i.rxId).length;

  // ── Export to CSV ──────────────────────────────────────────────────────────
  const handleExportReport = () => {
    if (filteredSummary.length === 0) return;
    setIsExporting(true);

    try {
      const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const headers = ['Invoice / Rx ID', 'Patient Name', 'Patient ID', 'Items Count', 'Total Amount (Rs.)', 'Payment Status', 'Dispensed Time', 'Type'];

      const rows = filteredSummary.map(item => [
        item.rxId ? `Rx-${item.rxId}` : (item.id || 'N/A'),
        item.verifiedPatient || item.patientName || 'N/A',
        item.patientId || 'N/A',
        item.orderItems?.length || 0,
        (parseFloat(item.total) || 0).toFixed(2),
        item.paymentStatus || 'Paid',
        item.dispensedTime || (item.dispensedAt ? new Date(item.dispensedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'),
        item.rxId ? 'Online Rx' : 'Walk-in'
      ]);

      // Add summary rows
      const summaryRows = [
        [],
        ['SUMMARY', '', '', '', '', '', '', ''],
        ['Total Patients', filteredSummary.length, '', '', '', '', '', ''],
        ['Total Items Dispensed', totalItemsDispensed, '', '', '', '', '', ''],
        ['Total Revenue (Rs.)', totalRevenue.toFixed(2), '', '', '', '', '', ''],
        ['Online Rx', onlineCount, '', '', '', '', '', ''],
        ['Walk-in Physical', physicalCount, '', '', '', '', '', ''],
        [],
        [`Report generated for: ${today}`, '', '', '', '', '', '', ''],
        [`Generated at: ${new Date().toLocaleTimeString('en-US')}`, '', '', '', '', '', '', ''],
      ];

      const csvContent = [
        [`MediCareX — Dispensed Today Report`, '', '', '', '', '', '', ''],
        [`Date: ${today}`, '', '', '', '', '', '', ''],
        [],
        headers,
        ...rows,
        ...summaryRows
      ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dispensed-today-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const getPatientName = (item) => item.verifiedPatient || item.patientName || item.patient || 'Unknown Patient';
  const getPatientId = (item) => item.patientId || 'N/A';
  const getRxId = (item) => item.rxId ? `Rx-${item.rxId}` : (item.id ? `#${item.id}` : 'N/A');
  const getTime = (item) => {
    if (item.dispensedTime) return item.dispensedTime;
    const ts = item.dispensedAt || item.createdAt || item.date;
    if (ts) return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return '—';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Dispensed Today</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => { setIsLoading(true); setDispensedSummary([]); window.location.reload(); }}
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Patients Today</p>
          </div>
          <h2 className="text-3xl font-black text-emerald-700">{filteredSummary.length}</h2>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Items Dispensed</p>
          </div>
          <h2 className="text-3xl font-black text-blue-700">{totalItemsDispensed}</h2>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider">Online / Walk-in</p>
          </div>
          <h2 className="text-3xl font-black text-purple-700">
            {onlineCount} <span className="text-lg font-bold text-purple-400">/ {physicalCount}</span>
          </h2>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Total Revenue</p>
          </div>
          <h2 className="text-2xl font-black text-amber-700">Rs. {totalRevenue.toFixed(2)}</h2>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice, Patient, or Phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
          </div>
          <button
            onClick={handleExportReport}
            disabled={isExporting || filteredSummary.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              filteredSummary.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-md'
            }`}
          >
            {isExporting
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-400" />
            <p className="font-medium text-sm">Loading today's dispensed records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice / Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Details</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSummary.length > 0 ? filteredSummary.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800">{getRxId(item)}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium">{getTime(item)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                          {getPatientName(item).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{getPatientName(item)}</div>
                          <div className="text-xs text-slate-400 mt-0.5">ID: {getPatientId(item)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                        <FileText className="w-3 h-3" />
                        {item.orderItems?.length || 0} item{(item.orderItems?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        item.rxId
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.rxId ? 'Online Rx' : 'Walk-in'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-slate-800">Rs. {(parseFloat(item.total) || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Paid
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-slate-400 font-medium text-sm">No dispensed prescriptions found for today.</p>
                      <p className="text-slate-300 text-xs mt-1">Dispensed records will appear here after completing a dispensing workflow.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredSummary.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-600">{filteredSummary.length}</span> records
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
            <p className="text-xs font-bold text-slate-700">
              Total: <span className="text-emerald-600">Rs. {totalRevenue.toFixed(2)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacistDispensedToday;
