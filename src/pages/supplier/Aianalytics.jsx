import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import {
  MdAutoAwesome, MdTrendingUp, MdWarning, MdInventory2,
  MdPayment, MdRefresh, MdInfo, MdCheckCircle, MdError, MdDownload,
} from 'react-icons/md';
import Card from '../../components/Card';

const API_BASE = `${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api`;

/* ── helpers ── */
const fmtRs = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const confidence = (score) => {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'High' };
  if (score >= 55) return { bar: 'bg-amber-500',   text: 'text-amber-700',   label: 'Medium' };
  return                  { bar: 'bg-red-500',      text: 'text-red-700',     label: 'Low' };
};

/* ── Toast ── */
const TOAST_CONFIG = {
  success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', iconBg: 'bg-emerald-500', icon: '✓' },
  error:   { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     iconBg: 'bg-red-500',     icon: '✕' },
  info:    { bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-800',    iconBg: 'bg-blue-500',    icon: 'ℹ' },
  warning: { bg: 'bg-amber-50 border-amber-200',      text: 'text-amber-800',   iconBg: 'bg-amber-500',   icon: '⚠' },
};

const MessageCard = ({ messages, removeMessage }) => (
  <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2.5 pointer-events-none">
    {messages.map((m) => {
      const cfg = TOAST_CONFIG[m.type];
      return (
        <div
          key={m.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-slate-200/60 min-w-[300px] max-w-[400px] ${cfg.bg}`}
          style={{ animation: 'slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0 mt-0.5 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <p className={`text-[13px] font-medium flex-1 leading-snug m-0 ${cfg.text}`}>{m.message}</p>
          <button onClick={() => removeMessage(m.id)} className="shrink-0 opacity-40 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-lg leading-none p-0">×</button>
        </div>
      );
    })}
  </div>
);

/* ── Skeleton loader ── */
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);

/* ── Confidence Bar ── */
const ConfidenceBar = ({ score }) => {
  const cfg = confidence(score);
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Confidence</span>
        <span className={`text-[12px] font-bold ${cfg.text}`}>{score}% · {cfg.label}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

/* ── Section Header ── */
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber:  'bg-amber-50 text-amber-600',
    emerald:'bg-emerald-50 text-emerald-600',
    red:    'bg-red-50 text-red-600',
  };
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-slate-900 leading-none">{title}</h2>
        {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

/* ── Urgency badge ── */
const UrgencyBadge = ({ level }) => {
  switch (level) {
    case 'urgent': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 ring-1 ring-red-200"> Urgent</span>;
    case 'supply': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200"> Supply Now</span>;
    case 'monitor': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200"> Monitor</span>;
    default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500">✓ No Action</span>;
  }
};

/* ── Risk badge ── */
const RiskBadge = ({ level }) => {
  switch (level) {
    case 'High':   return <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11.5px] font-bold bg-red-50 text-red-700 ring-1 ring-red-200">High Risk</span>;
    case 'Medium': return <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11.5px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">Medium Risk</span>;
    default:       return <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11.5px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Low Risk</span>;
  }
};

/* ── Pending stat card (shown before first analysis) ── */
const PendingCard = ({ title, icon: Icon, color = 'slate' }) => {
  const colorMap = {
    slate:  { bg: 'bg-slate-50',  icon: 'text-slate-400',  dot: 'bg-slate-300'  },
    red:    { bg: 'bg-red-50',    icon: 'text-red-300',    dot: 'bg-red-300'    },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-300',  dot: 'bg-amber-300'  },
    emerald:{ bg: 'bg-emerald-50',icon: 'text-emerald-300',dot: 'bg-emerald-300'},
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div className={`rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 ${c.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
        <Icon size={18} className={c.icon} />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex gap-1 items-center">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${c.dot} opacity-60`} />
          ))}
        </div>
      </div>
      <p className="text-[11.5px] text-slate-400 font-medium m-0">Run analysis to view</p>
    </div>
  );
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const AiAnalyticsDashboard = () => {
  const [supplierId, setSupplierId] = useState(null);
  const [invoices, setInvoices]     = useState([]);
  const [messages, setMessages]     = useState([]);

  /* AI result states */
  const [supplyRecs, setSupplyRecs]   = useState([]);
  const [demandData, setDemandData]   = useState([]);
  const [paymentRisk, setPaymentRisk] = useState([]);
  const [restockData, setRestockData] = useState([]);

  const [loadingAI, setLoadingAI] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [lastRun, setLastRun]     = useState(null);
  const [activeTab, setActiveTab] = useState('supply');
  const [analysisRan, setAnalysisRan] = useState(false);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, type, message }]);
    setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 5000);
  };
  const removeMessage = (id) => setMessages(prev => prev.filter(m => m.id !== id));

  /* Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setSupplierId(user?.uid ?? null));
    return () => unsub();
  }, []);

  /* Fetch invoices from Firestore */
  useEffect(() => {
    if (!supplierId) return;
    const fetchInvoices = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'invoices'), where('supplierId', '==', supplierId), orderBy('createdAt', 'desc'))
        );
        setInvoices(snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            invoiceDate: data.invoiceDate?.toDate ? data.invoiceDate.toDate().toISOString().split('T')[0] : data.invoiceDate,
            dueDate:     data.dueDate?.toDate     ? data.dueDate.toDate().toISOString().split('T')[0]     : data.dueDate,
            paidDate:    data.paidDate?.toDate    ? data.paidDate.toDate().toISOString().split('T')[0]    : null,
            createdAt:   data.createdAt?.toDate   ? data.createdAt.toDate().toISOString()                 : null,
          };
        }));
      } catch (e) {
        showToast('Failed to load invoice data: ' + e.message, 'error');
      }
    };
    fetchInvoices();
  }, [supplierId]);

  /* Call AI backend */
  const runAIAnalysis = async () => {
    if (!invoices.length) { showToast('No invoice data available to analyse.', 'warning'); return; }
    setLoadingAI(true);
    setSupplyRecs([]);
    setDemandData([]);
    setPaymentRisk([]);
    setRestockData([]);
    showToast('Running AI analysis…', 'info');

    try {
      const payload = {
        supplierId,
        invoices: invoices.map(inv => ({
          id: inv.id,
          productName: inv.productName || inv.items?.[0]?.productName || inv.items?.[0]?.name || 'Unknown',
          totalAmount: inv.totalAmount || 0,
          paymentStatus: inv.paymentStatus,
          invoiceType: inv.invoiceType,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          paidDate: inv.paidDate || null,
          items: inv.items || [],
          pharmacy: inv.pharmacy,
          orderId: inv.orderId,
        })),
      };

      const [supplyRes, demandRes, riskRes, restockRes] = await Promise.all([
        fetch(`${API_BASE}/ai/supply-recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
        fetch(`${API_BASE}/ai/demand-forecast`,        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
        fetch(`${API_BASE}/ai/payment-risk`,           { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
        fetch(`${API_BASE}/ai/restock-suggestions`,    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      ]);

      const responses = [
        { name: 'Supply recommendations', response: supplyRes },
        { name: 'Demand forecast', response: demandRes },
        { name: 'Payment risk', response: riskRes },
        { name: 'Restock suggestions', response: restockRes },
      ];

      const failed = responses.filter(({ response }) => !response.ok);
      if (failed.length) {
        throw new Error(`${failed.map(({ name, response }) => `${name} (HTTP ${response.status})`).join(', ')} failed`);
      }

      const [supplyJson, demandJson, riskJson, restockJson] = await Promise.all([
        supplyRes.json(),
        demandRes.json(),
        riskRes.json(),
        restockRes.json(),
      ]);

      setSupplyRecs(supplyJson.recommendations || []);
      setDemandData(demandJson.forecasts || []);
      setPaymentRisk(riskJson.risks || []);
      setRestockData(restockJson.suggestions || []);

      setAnalysisRan(true);
      setLastRun(new Date());
      showToast('AI analysis complete!', 'success');
    } catch (err) {
      console.error(err);
      showToast('AI analysis failed: ' + err.message, 'error');
    } finally {
      setLoadingAI(false);
    }
  };

  /* Download Summary PDF — backend-generated, same pattern as InvoicePayments' generatePDF */
  const downloadSummaryPDF = async () => {
    if (!analysisRan) { showToast('Run AI analysis first to generate a summary.', 'warning'); return; }
    try {
      setDownloadingPDF(true);
      showToast('Generating summary PDF...', 'info');

      const response = await fetch(`${API_BASE}/ai/generate-summary-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          generatedAt: new Date().toISOString(),
          invoiceCount: invoices.length,
          supplyRecommendations: supplyRecs,
          demandForecast: demandData,
          paymentRisk: paymentRisk,
          restockSuggestions: restockData,
        }),
      });

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try { const j = await response.json(); errMsg = j.message || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AI-Analytics-Summary-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Summary PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      showToast('Failed to generate summary PDF: ' + error.message, 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  /* ── Summary counts ── */
  const urgentCount   = supplyRecs.filter(r => r.urgency === 'urgent').length;
  const highRiskCount = paymentRisk.filter(r => r.riskLevel === 'High').length;
  const restockCount  = restockData.filter(r => r.restock).length;

  /* ── Tabs ── */
  const TABS = [
    { id: 'supply',  label: 'Supply Recommendations', icon: MdInventory2 },
    { id: 'demand',  label: 'Demand Forecast',        icon: MdTrendingUp },
    { id: 'risk',    label: 'Payment Risk',            icon: MdWarning    },
    { id: 'restock', label: 'Restock Suggestions',    icon: MdPayment    },
  ];

  const tabColor = (id) =>
    activeTab === id
      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
      : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600';

  const hasResults =
  supplyRecs.length > 0 ||
  demandData.length > 0 ||
  paymentRisk.length > 0 ||
  restockData.length > 0;

  return (
    <div className="p-4 sm:p-6 bg-slate-100 min-h-screen">
      <MessageCard messages={messages} removeMessage={removeMessage} />

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: title + description */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            AI Analytics Dashboard
          </h1>
          <p className="text-[13.5px] text-slate-500">
            AI-powered supply, demand, and payment insights from your invoice history
          </p>
        </div>

        {/* Right: last-run time + buttons */}
        <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0 flex-wrap">
          {lastRun ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Last run: {lastRun.toLocaleTimeString()}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
              Not yet analysed
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={downloadSummaryPDF}
              disabled={downloadingPDF || !analysisRan}
              title={!analysisRan ? 'Run AI analysis first' : 'Download Summary PDF'}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-[13px] sm:text-[13.5px] font-semibold rounded-xl border border-slate-200 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <MdDownload size={16} className={downloadingPDF ? 'animate-bounce' : ''} />
              {downloadingPDF ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={runAIAnalysis}
              disabled={loadingAI || !invoices.length}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] sm:text-[13.5px] font-semibold rounded-xl border-none cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              <MdRefresh size={16} className={loadingAI ? 'animate-spin' : ''} />
              {loadingAI ? 'Analysing…' : 'Run AI Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Invoices Analysed — always show real count */}
        <Card title="Invoices Loaded" value={invoices.length > 0 ? invoices.length : '—'} />

        {/* The remaining 3 cards: pending state before first run, real values after */}
        {!analysisRan ? (
          <>
            <PendingCard title="Urgent Supply Items" icon={MdInventory2} color="red" />
            <PendingCard title="High Payment Risk"   icon={MdWarning}    color="amber" />
            <PendingCard title="Restock Needed"      icon={MdPayment}    color="emerald" />
          </>
        ) : (
          <>
            <Card title="Urgent Supply Items" value={loadingAI ? '…' : urgentCount} />
            <Card title="High Payment Risk"   value={loadingAI ? '…' : highRiskCount} />
            <Card title="Restock Needed"      value={loadingAI ? '…' : restockCount} />
          </>
        )}
      </div>

      {/* ── Info banner before first run ── */}
      {!analysisRan && !loadingAI && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <MdInfo size={18} className="text-blue-600" />
          </div>
          <p className="text-[13px] text-blue-800 font-medium m-0 leading-relaxed">
            Click <strong>Run AI Analysis</strong> to generate supply recommendations, demand forecasts, payment risk scores, and restock suggestions based on your invoice history.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      {(analysisRan || loadingAI) && (
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-5 flex items-center gap-2 flex-wrap shadow-sm">
          <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mr-2">View</span>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all duration-200 ${tabColor(id)}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loadingAI && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-1.5 w-full mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* ════════════ SUPPLY RECOMMENDATIONS ════════════ */}
      {!loadingAI && hasResults && activeTab === 'supply' && (
        <div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-5">
            <SectionHeader icon={MdInventory2} title="Supply Recommendations" subtitle="AI-assessed urgency based on payment history and order frequency" color="blue" />
            {supplyRecs.length === 0 ? (
              <EmptyState message="No supply recommendations generated." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {supplyRecs.map((rec, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[14px] font-bold text-slate-800 leading-snug">{rec.productName}</p>
                      <UrgencyBadge level={rec.urgency} />
                    </div>
                    <p className="text-[12.5px] text-slate-500 mb-3 leading-relaxed">{rec.reason}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Stat label="Invoices" value={rec.invoiceCount} />
                      <Stat label="Total Value" value={fmtRs(rec.totalValue)} />
                      <Stat label="Avg Order" value={fmtRs(rec.avgOrderValue)} />
                      <Stat label="Paid Rate" value={`${rec.paymentRate}%`} />
                    </div>
                    <ConfidenceBar score={rec.confidence} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ DEMAND FORECAST ════════════ */}
      {!loadingAI && hasResults && activeTab === 'demand' && (
        <div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-5">
            <SectionHeader icon={MdTrendingUp} title="Demand Forecast" subtitle="Projected invoice volume and value for the next period based on historical trends" color="violet" />
            {demandData.length === 0 ? (
              <EmptyState message="Not enough data to generate demand forecasts. At least 3 months of history per product are needed." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Product', 'Avg Monthly Orders', 'Trend', 'Predicted Next Month Value', 'Growth', 'Confidence'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11.5px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demandData.map((item, i) => {
                      const cfg = confidence(item.confidence);
                      return (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-4 text-[13.5px] font-bold text-slate-800">{item.productName}</td>
                          <td className="px-5 py-4 text-[13px] text-slate-600">{item.avgMonthlyOrders}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[13px] font-semibold ${item.trend === 'up' ? 'text-emerald-600' : item.trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>
                              {item.trend === 'up' ? '↑ Growing' : item.trend === 'down' ? '↓ Declining' : '→ Stable'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[13.5px] font-bold text-blue-700">{fmtRs(item.predictedValue)}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[13px] font-semibold ${item.growthRate >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.growthRate >= 0 ? '+' : ''}{item.growthRate}%
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${item.confidence}%` }} />
                              </div>
                              <span className={`text-[12px] font-bold ${cfg.text}`}>{item.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ PAYMENT RISK ════════════ */}
      {!loadingAI && hasResults && activeTab === 'risk' && (
        <div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-5">
            <SectionHeader icon={MdWarning} title="Payment Risk Analysis" subtitle="Likelihood of late or missed payment per invoice, based on historical patterns" color="amber" />
            {paymentRisk.length === 0 ? (
              <EmptyState message="No unpaid invoices to assess for payment risk." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paymentRisk.map((risk, i) => (
                  <div key={i} className={`rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
                    risk.riskLevel === 'High'   ? 'bg-red-50 border-red-200' :
                    risk.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-200' :
                                                  'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[13px] font-bold text-slate-600 font-mono">{risk.invoiceNumber}</p>
                        <p className="text-[14px] font-bold text-slate-800 mt-0.5">{risk.productName}</p>
                      </div>
                      <RiskBadge level={risk.riskLevel} />
                    </div>
                    <p className="text-[12.5px] text-slate-500 mb-3 leading-relaxed">{risk.reason}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Stat label="Invoice Amount" value={fmtRs(risk.amount)} />
                      <Stat label="Due Date"       value={risk.dueDate} />
                      <Stat label="Days Overdue"   value={risk.daysOverdue != null ? `${risk.daysOverdue}d` : 'N/A'} />
                      <Stat label="Risk Score"     value={`${risk.riskScore}%`} />
                    </div>
                    <div className="h-1.5 bg-white/70 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          risk.riskLevel === 'High' ? 'bg-red-500' : risk.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${risk.riskScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ RESTOCK SUGGESTIONS ════════════ */}
      {!loadingAI && hasResults && activeTab === 'restock' && (
        <div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-5">
            <SectionHeader icon={MdPayment} title="Restock Suggestions" subtitle="Recommended order quantities based on invoice demand patterns" color="emerald" />
            {restockData.length === 0 ? (
              <EmptyState message="Not enough data to generate restock suggestions." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Product', 'Recent Orders', 'Avg Invoice Value', 'Restock?', 'Suggested Order Value', 'Reasoning', 'Confidence'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11.5px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {restockData.map((item, i) => {
                      const cfg = confidence(item.confidence);
                      return (
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-5 py-4 text-[13.5px] font-bold text-slate-800">{item.productName}</td>
                          <td className="px-5 py-4 text-[13px] text-slate-600">{item.recentOrders}</td>
                          <td className="px-5 py-4 text-[13px] text-slate-600">{fmtRs(item.avgInvoiceValue)}</td>
                          <td className="px-5 py-4">
                            {item.restock
                              ? <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700"><MdCheckCircle size={14}/> Yes</span>
                              : <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400"><MdError size={14}/> No</span>}
                          </td>
                          <td className="px-5 py-4 text-[13.5px] font-bold text-blue-700">{item.restock ? fmtRs(item.suggestedOrderValue) : '—'}</td>
                          <td className="px-5 py-4 text-[12.5px] text-slate-500 max-w-[200px]">{item.reasoning}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${item.confidence}%` }} />
                              </div>
                              <span className={`text-[12px] font-bold ${cfg.text}`}>{item.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      {hasResults && !loadingAI && (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <MdInfo size={15} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400 m-0 leading-relaxed">
            AI predictions are based on your invoice history and statistical patterns. These are decision-support suggestions, not guaranteed outcomes. Always verify with current inventory and market conditions.
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideInRight { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
};

/* ── Small helpers ── */
const Stat = ({ label, value }) => (
  <div>
    <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-[13px] text-slate-700 font-bold m-0 truncate">{value}</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="py-10 text-center flex flex-col items-center gap-3">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
      <MdAutoAwesome size={22} className="text-slate-400" />
    </div>
    <p className="text-[13.5px] font-semibold text-slate-600">{message}</p>
  </div>
);

export default AiAnalyticsDashboard;