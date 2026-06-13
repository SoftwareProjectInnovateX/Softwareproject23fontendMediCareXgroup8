import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Upload, ClipboardList, Clock, Sparkles, TrendingUp, Zap, Heart, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { C, FONT }   from '../../components/profile/profileTheme';
import PageBanner     from '../../components/profile/PageBanner';
import OrderCard      from '../../components/orders/OrderCard';
import { ROUTES }     from '../../components/utils/constants';


const API_BASE = 'http://localhost:5000/api/customer-orders';

const COLLECTIONS = {
  CUSTOMER_ORDERS: 'CustomerOrders',
};

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders]               = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('orders');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let unsubPres = () => {};

    const fetchOrders = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(API_BASE, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const tagged = data.map(d => ({
          ...d,
          type: 'regular',
          orderStatus: d.orderStatus || 'pending',
        }));
        setOrders(tagged);
      } catch (err) {
        console.error('Failed to fetch orders from backend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    if (!currentUser?.uid) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }

    const localKey = `my_prescriptions_${currentUser.uid}`;
    const qPres = query(
      collection(db, 'prescriptions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    unsubPres = onSnapshot(qPres, (snap) => {
      const all = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          ...p,
          type: 'prescription',
          customerName:  p.customerName || 'Prescription Upload',
          phone:         p.customerPhone,
          address:       p.customerAddress,
          orderStatus:   p.status || 'Pending',
          paymentMethod: p.medications?.length > 0 ? 'Pharmacy Quote' : 'Pending Review',
          paymentStatus: p.status === 'Paid' ? 'paid' : 'pending',
          types: (p.medications || p.orderItems || []).map(m => ({
            name:     m.name,
            quantity: m.qty,
            price:    m.price,
            id:       'RX-ITEM',
          })),
          createdAt: p.createdAt,
        };
      });

      const localIds = JSON.parse(localStorage.getItem(localKey) || '[]');
      const filtered = all.filter(p => {
        if (currentUser?.uid && p.userId === currentUser.uid) return true;
        if (localIds.includes(p.id)) return true;
        return false;
      });

      setPrescriptions(filtered);
    });

    return () => { unsubPres(); };
  }, [currentUser]);

  const prescriptionIds = new Set(prescriptions.map(p => p.id));
  const visibleOrders = orders.filter((item) => {
    if (item.rxId && prescriptionIds.has(item.rxId)) return false;
    return true;
  });

  const generateAIInsights = () => {
    const allOrders = [...visibleOrders, ...prescriptions];
    if (allOrders.length === 0) {
      return {
        totalSpending: 0, avgOrderValue: 0, orderFrequency: 'N/A',
        deliveryPrediction: 'No orders yet', healthTrends: [],
        recommendations: ['Start placing orders to get AI insights'],
        nextOrderEstimate: 'No prediction available', savingsOpportunity: 0,
      };
    }

    const totalSpending = allOrders.reduce((sum, order) => {
      if (order.totalPrice) return sum + order.totalPrice;
      if (order.types) return sum + (order.types.reduce((s, t) => s + (t.price * t.quantity), 0));
      return sum;
    }, 0);

    const avgOrderValue = totalSpending / allOrders.length;

    const recentOrders = allOrders.filter(o => {
      const date = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
      const daysSince = (new Date() - date) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    const orderFrequency = recentOrders.length > 0
      ? `${recentOrders.length} orders in last 30 days` : 'Less frequent';

    const deliveryPrediction = (() => {
      const processingOrders = allOrders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing');
      if (processingOrders.length === 0) return 'No active orders';
      return '2-4 business days';
    })();

    const healthTrends = prescriptions.length > 0
      ? prescriptions.flatMap(p => p.types || [])
          .reduce((acc, item) => {
            const existing = acc.find(h => h.name === item.name);
            if (existing) existing.count++;
            else acc.push({ name: item.name, count: 1 });
            return acc;
          }, [])
          .sort((a, b) => b.count - a.count).slice(0, 3)
      : [];

    const recommendations = [];
    if (visibleOrders.length > 5) recommendations.push('✓ Regular customer – you\'re saving with bulk orders');
    if (avgOrderValue > 100) recommendations.push('💡 Consider setting up auto-reorder for frequent items');
    if (prescriptions.length >= 3) recommendations.push('🏥 Health priority detected – check prescription discounts');
    if (recentOrders.length === 0) recommendations.push('💪 No recent orders – time to refill essentials?');
    if (recommendations.length === 0) recommendations.push('📊 Keep an eye on your order patterns');

    const avgDaysInterval = recentOrders.length > 1
      ? (() => {
          const dates = recentOrders
            .map(o => new Date(o.createdAt?.seconds * 1000 || o.createdAt))
            .sort((a, b) => b - a);
          const intervals = [];
          for (let i = 0; i < dates.length - 1; i++) {
            intervals.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
          }
          return intervals.reduce((a, b) => a + b, 0) / intervals.length;
        })()
      : 15;

    const nextOrderDate = new Date();
    nextOrderDate.setDate(nextOrderDate.getDate() + Math.round(avgDaysInterval));
    const nextOrderEstimate = `Around ${nextOrderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const savingsOpportunity = avgOrderValue > 150 ? Math.round(avgOrderValue * 0.07) : 0;

    return {
      totalSpending: Math.round(totalSpending), avgOrderValue: Math.round(avgOrderValue),
      orderFrequency, deliveryPrediction, healthTrends, recommendations,
      nextOrderEstimate, savingsOpportunity,
    };
  };

  const aiInsights = generateAIInsights();

  const summary = {
    totalOrders: visibleOrders.length,
    activeOrders: visibleOrders.filter((o) => !['Delivered', 'Cancelled'].includes(o.orderStatus)).length,
    totalPrescriptions: prescriptions.length,
    pendingPrescriptions: prescriptions.filter((p) => p.orderStatus === 'Pending').length,
    approvedPrescriptions: prescriptions.filter((p) => p.orderStatus === 'Approved').length,
    ...aiInsights,
  };

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9', fontFamily: FONT.body }}>

      <PageBanner
        title="My Orders & Prescriptions"
        subtitle="Manage your cart orders and prescription requests in one place."
      >
        <div className="flex flex-wrap gap-3 mt-2">
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl bg-white border-none cursor-pointer hover:opacity-90 transition-all shadow-md"
            style={{ color: C.accent }}
          >
            <Upload size={13} /> Upload Prescription
          </button>
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl text-white cursor-pointer hover:opacity-90 transition-all"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}
          >
            <ClipboardList size={13} /> Prescription History
          </button>
        </div>
      </PageBanner>

      <div className="max-w-[1120px] mx-auto px-5 py-8 space-y-6">

        {/* ── TOP SUMMARY STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Cart Orders',        value: summary.totalOrders,          icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Prescriptions',      value: summary.totalPrescriptions,   icon: ClipboardList, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Pending Review',     value: summary.pendingPrescriptions, icon: Clock,        color: '#d97706', bg: '#fffbeb' },
            { label: 'In Progress',        value: summary.activeOrders,         icon: Zap,          color: '#059669', bg: '#ecfdf5' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#0f172a' }}>{value}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── HERO + QUICK ACTIONS ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">

          {/* Hero card */}
          <div className="rounded-2xl p-7" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Dashboard</p>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Everything in one place</h2>
            <p className="text-sm text-slate-500 leading-6 max-w-lg">
              Browse active orders and prescription requests in separate sections so you can manage your cart and medical authorizations faster.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Cart orders',            value: summary.totalOrders,          sub: 'Orders via cart & checkout' },
                { label: 'Prescription requests',  value: summary.totalPrescriptions,   sub: 'Pending pharmacist review' },
                { label: 'Pending review',         value: summary.pendingPrescriptions, sub: 'Awaiting approval' },
                { label: 'In progress',            value: summary.activeOrders,         sub: 'Being prepared or shipped' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(145deg, #1e3a8a, #1d4ed8, #0ea5e9)', boxShadow: '0 8px 32px rgba(29,78,216,0.25)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-200 mb-1">Quick actions</p>
            <h3 className="text-xl font-black mb-2">Manage faster</h3>
            <p className="text-sm text-blue-100 mb-6 leading-5">Shortcuts for instant order, prescription, and tracking actions.</p>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Upload prescription',    icon: Upload,       onClick: () => navigate(ROUTES.CUSTOMER_PRESCRIPTION), style: 'bg-white/15 hover:bg-white/25' },
                { label: 'Review cart orders',     icon: ShoppingCart, onClick: () => { setActiveTab('orders');        document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' }); }, style: 'bg-sky-500/20 hover:bg-sky-500/35 border border-white/15' },
                { label: 'Browse prescriptions',   icon: ClipboardList,onClick: () => { setActiveTab('prescriptions'); document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' }); }, style: 'bg-white/15 hover:bg-white/25' },
                { label: 'Track active orders',    icon: Clock,        onClick: () => { setActiveTab('orders');        document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' }); }, style: 'bg-sky-500/20 hover:bg-sky-500/35 border border-white/15' },
              ].map(({ label, icon: Icon, onClick, style }) => (
                <button key={label} onClick={onClick}
                  className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition ${style}`}
                >
                  <span>{label}</span>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI INSIGHTS ── */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #f0f9ff, #eff6ff, #f0fdf4)', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Sparkles size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">AI Powered</p>
              <h3 className="text-xl font-black text-slate-900">Order Intelligence</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-5 ml-12">Smart analysis of your ordering patterns and personalized recommendations.</p>

          {/* Metric cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            {[
              { label: 'Total Spending',  value: `Rs${summary.totalSpending.toLocaleString()}`, sub: 'Across all orders',  icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Avg Order',       value: `Rs${summary.avgOrderValue}`,                  sub: 'Per order value',    icon: Zap,        color: '#d97706', bg: '#fffbeb' },
              { label: 'Frequency',       value: summary.orderFrequency,                        sub: 'Order pattern',      icon: Clock,      color: '#2563eb', bg: '#eff6ff' },
              { label: 'Delivery ETA',    value: summary.deliveryPrediction,                    sub: 'For active orders',  icon: CheckCircle,color: '#16a34a', bg: '#f0fdf4' },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon size={13} color={color} />
                  </div>
                </div>
                <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Second row */}
          <div className="grid gap-3 lg:grid-cols-3">

            {/* Health trends */}
            <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <Heart size={13} className="text-red-500" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Health Trends</p>
              </div>
              {summary.healthTrends.length > 0 ? (
                <div className="space-y-2">
                  {summary.healthTrends.map((trend, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#f8fafc' }}>
                      <p className="text-sm font-semibold text-slate-800">{trend.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>{trend.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Upload prescriptions to track health trends.</p>
              )}
            </div>

            {/* Next order prediction */}
            <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center">
                  <Lightbulb size={13} className="text-yellow-500" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Next Order</p>
              </div>
              <p className="text-base font-black text-slate-900 mb-3">{summary.nextOrderEstimate}</p>
              {summary.savingsOpportunity > 0 && (
                <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-700">💰 Save up to</p>
                  <p className="text-xl font-black text-green-700 mt-1">Rs{summary.savingsOpportunity}</p>
                  <p className="text-xs text-green-600 mt-0.5">with bulk orders</p>
                </div>
              )}
            </div>


          </div>
        </div>

        {/* ── ORDERS + ASIDE ── */}
        <section id="order-tab-panel" className="grid gap-5 lg:grid-cols-[1fr_300px]">

          <div className="space-y-4">

            {/* Tab switcher */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Order hub</p>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Choose what to review</h3>
                </div>
                <div className="flex gap-1.5 rounded-xl p-1" style={{ background: '#f1f5f9' }}>
                  {[
                    { key: 'orders',        label: 'Cart Orders' },
                    { key: 'prescriptions', label: 'Prescriptions' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={activeTab === key
                        ? { background: '#0f172a', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                        : { color: '#64748b' }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-3">
                Use the tabs to focus on current cart orders or review prescription history without clutter.
              </p>
            </div>

            {/* Orders list */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {activeTab === 'orders' ? (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Cart orders</p>
                      <h4 className="text-xl font-black text-slate-900 mt-0.5">Your latest orders</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: '#f1f5f9', color: '#64748b' }}>
                      {visibleOrders.length} items
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-5">Orders not tied to prescriptions are shown here.</p>
                  <div className="space-y-4">
                    {visibleOrders.length === 0 ? (
                      <div className="rounded-xl p-10 text-center" style={{ background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                        <ShoppingCart size={32} color="#cbd5e1" className="mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">No cart orders yet</p>
                        <p className="text-xs text-slate-400 mt-1">Place a new order and it will appear here.</p>
                      </div>
                    ) : visibleOrders.map((item) => (
                      <OrderCard key={item.id} order={item} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Prescriptions</p>
                      <h4 className="text-xl font-black text-slate-900 mt-0.5">Prescription history</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: '#f1f5f9', color: '#64748b' }}>
                      {prescriptions.length} submitted
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-5">Check uploads, approval status, and payment steps from one place.</p>
                  <div className="space-y-4">
                    {prescriptions.length === 0 ? (
                      <div className="rounded-xl p-10 text-center" style={{ background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                        <ClipboardList size={32} color="#cbd5e1" className="mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-600">No prescriptions submitted</p>
                        <p className="text-xs text-slate-400 mt-1">Upload a prescription to begin tracking it here.</p>
                      </div>
                    ) : prescriptions.map((item) => (
                      <OrderCard key={item.id} order={item} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Aside ── */}
          <aside className="space-y-4 self-start lg:sticky lg:top-24">

            {/* Order progress */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-0.5">Summary</p>
              <h3 className="text-lg font-black text-slate-900 mb-4">Order progress</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Orders in progress',     value: summary.activeOrders,          color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Pending approval',        value: summary.pendingPrescriptions,  color: '#d97706', bg: '#fffbeb' },
                  { label: 'Approved prescriptions',  value: summary.approvedPrescriptions, color: '#16a34a', bg: '#f0fdf4' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: bg }}>
                    <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                    <p className="text-xl font-black" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent prescriptions */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Quick review</p>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Recent prescriptions</h3>
                </div>
                <button onClick={() => setActiveTab('prescriptions')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {prescriptions.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p className="text-xs font-bold text-slate-800">#{item.id.slice(-6)}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#2563eb' }}>
                      {item.orderStatus}
                    </span>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <p className="text-xs text-slate-400">No recent prescriptions. Upload one to track it here.</p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-0.5">Tips</p>
              <h3 className="text-lg font-black text-slate-900 mb-4">Order smarter</h3>
              <ul className="space-y-3">
                {[
                  'Keep your delivery details up to date for faster checkout.',
                  'Upload clear prescriptions so pharmacist review is faster.',
                  'Use status badges to know when payment or delivery is next.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-500 leading-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800 flex-shrink-0 mt-1.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}