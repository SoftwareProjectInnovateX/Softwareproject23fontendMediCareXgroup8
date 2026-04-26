import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getInventory, getReturnRequests, getPatients } from '../../services/pharmacistService';
import { 
  FileText, 
  Calendar,
  Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistDashboard = () => {
  const navigate = useNavigate();
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [clockDisplay, setClockDisplay] = useState('');
  const scrollRef = useRef(null);
  
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [walkinRxRev, setWalkinRxRev] = useState(0);
  const [walkinOtcRev, setWalkinOtcRev] = useState(0);
  const [onlinePaidRev, setOnlinePaidRev] = useState(0);
  const [onlineCodRev, setOnlineCodRev] = useState(0);
  const [onlineRevCard, setOnlineRevCard] = useState(0);
  const [onlineRevBank, setOnlineRevBank] = useState(0);
  const [onlineRevPayHere, setOnlineRevPayHere] = useState(0);
  const [onlineRevCod, setOnlineRevCod] = useState(0);
  const [dispensedTodayCount, setDispensedTodayCount] = useState(0);
  const [physicalDispensedCount, setPhysicalDispensedCount] = useState(0);
  const [onlineDispensedCount, setOnlineDispensedCount] = useState(0);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [totalInventoryCount, setTotalInventoryCount] = useState(0);
  const [pendingReturns, setPendingReturns] = useState(0);

  // Optimized: Fetch patient count from backend instead of direct Firebase listener
  const updatePatientCount = async () => {
    try {
      const patients = await getPatients();
      const count = patients.filter(p => p.role === 'customer').length;
      setTotalPatientsCount(count);
    } catch (err) {
      console.warn('Failed to fetch patient count:', err);
    }
  };

  useEffect(() => {
    updatePatientCount();
    // Refresh every 5 minutes instead of real-time
    const interval = setInterval(updatePatientCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── UNIFIED FETCH: shares dispensedList + onlineOrders between revenue & activity log
  //     to avoid duplicate API calls on every refresh ────────────────────────────
  const fetchAllDashboardData = async () => {
    try {
      const { getDispensedHistory, getOnlineOrders } = await import('../../services/pharmacistService');
      const todayStr = new Date().toDateString();

      // Single fetch — shared by both revenue calc AND activity log
      const [dispensedList, onlineOrders, returns] = await Promise.all([
        getDispensedHistory(),
        getOnlineOrders(),
        getReturnRequests(),
      ]);

      // ── Revenue & dispensed counts ──────────────────────────────────────────
      const todayDispensed = dispensedList.filter(item => {
        const ds = item.dispensedDate || 
                   (item.dispensedAt ? new Date(item.dispensedAt).toDateString() : null) || 
                   (item.createdAt ? new Date(item.createdAt).toDateString() : null) ||
                   (item.date ? new Date(item.date).toDateString() : null);
        return ds === todayStr;
      });
      setDispensedTodayCount(todayDispensed.length);

      let wRxRev = 0, wOtcRev = 0, dRev = 0;
      let dRevCard = 0, dRevBank = 0, dRevPayHere = 0, dRevCod = 0;
      let onlineDispCount = 0, physicalDispCount = 0;
      
      const uniquePatients = new Set();
      const onlinePatients = new Set();
      const physicalPatients = new Set();

      todayDispensed.forEach(d => {
        const amt = parseFloat(d.total) || 0;
        const patientKey = d.patientId || d.patientName || d.verifiedPatient || d.customerName || d.rxId;
        if (patientKey) uniquePatients.add(patientKey);

        const isOnline = d.orderType === 'Online' || d.rxId;

        if (isOnline) {
          onlineDispCount++;
          if (patientKey) onlinePatients.add(patientKey);
          // Count revenue if it's Paid OR if it's a confirmed COD order
          if (d.paymentStatus === 'Paid' || d.paymentStatus === 'COD' || d.status === 'Successful') {
            dRev += amt;
            if (d.paymentMethod === 'Card Payment' || d.paymentMethod === 'ONLINE') dRevCard += amt;
            else if (d.paymentMethod === 'Bank Transfer') dRevBank += amt;
            else if (d.paymentMethod === 'PayHere') dRevPayHere += amt;
            else if (d.paymentMethod === 'COD') dRevCod += amt;
            else dRevCard += amt;
          }
        } else {
          physicalDispCount++;
          if (patientKey) physicalPatients.add(patientKey);
          if (d.paymentStatus === 'Paid' || d.status === 'Successful') {
            if (d.type === 'prescription' || d.id?.includes('RX')) {
              wRxRev += amt;
            } else {
              wOtcRev += amt;
            }
          }
        }
      });

      setDailyRevenue(dRev);
      setOnlineRevCard(dRevCard);
      setOnlineRevBank(dRevBank);
      setOnlineRevPayHere(dRevPayHere);
      setOnlineRevCod(dRevCod);
      setWalkinRxRev(wRxRev);
      setWalkinOtcRev(wOtcRev);
      
      // Update metrics to represent Unique Customer Count as requested
      setDispensedTodayCount(uniquePatients.size);
      setOnlineDispensedCount(onlinePatients.size);
      setPhysicalDispensedCount(physicalPatients.size);

      // ── Online Orders Revenue Logic ──────────────────────────────────────────
      let otherPaidRev = 0, otherCodRev = 0;
      let prescPaidRev = 0, prescCodRev = 0;

      onlineOrders.forEach(o => {
        // Handle timestamps consistently
        const ts = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) :
                   o.createdAt?.toDate   ? o.createdAt.toDate() :
                   o.orderDate           ? new Date(o.orderDate) :
                   o.timestamp           ? new Date(o.timestamp) : null;

        if (!ts || isNaN(ts.getTime()) || !isToday(ts)) return;

        const amt = parseFloat(o.totalAmount || o.total || 0);
        const isPaid = (o.paymentStatus || "").toLowerCase() === 'paid' || 
                       (o.paymentMethod || "").toLowerCase() === 'online';
        const isCOD  = (o.paymentMethod || "").toLowerCase() === 'cod';
        const isRx   = !!(o.rxId || o.isPrescription);

        if (isRx) {
          if (isPaid) prescPaidRev += amt;
          else if (isCOD) prescCodRev += amt;
        } else {
          if (isPaid) otherPaidRev += amt;
          else if (isCOD) otherCodRev += amt;
        }
      });

      // Update states for Online Prescriptions card
      setDailyRevenue(prescPaidRev + prescCodRev); 
      setOnlineRevCard(prescPaidRev); // Using this for the blue 'Paid' circle
      setOnlineRevCod(prescCodRev);  // Using this for the amber 'COD' circle

      // Update states for "Online Other Order" card
      setOnlinePaidRev(otherPaidRev);
      setOnlineCodRev(otherCodRev);

      // ── Returns count ───────────────────────────────────────────────────────
      const pending = returns.filter(r => r.status === 'Pending').length;
      setPendingReturns(pending);

      // ── Activity log — built from the same already-fetched data ─────────────
      const entries = [];

      dispensedList.slice(-30).forEach(d => {
        const ts = d.dispensedAt ? new Date(d.dispensedAt) :
                   d.createdAt  ? new Date(d.createdAt)  :
                   d.date       ? new Date(d.date)        : null;
        if (!ts || isNaN(ts) || !isToday(ts)) return;
        const patientLabel = d.patientName || d.patient || 'Patient';
        const rxLabel = d.rxId ? `Rx #${d.rxId}` : (d.id ? `#${d.id}` : '');
        entries.push({
          ts,
          color: 'bg-emerald-500',
          text: `Dispensed ${rxLabel} to ${patientLabel}`,
          highlight: 'Dispensed',
          highlightColor: 'text-emerald-600',
        });
      });

      onlineOrders.slice(-30).forEach(o => {
        // Handle Firestore timestamps (_seconds) or standard Date objects
        const ts = o.createdAt?._seconds ? new Date(o.createdAt._seconds * 1000) :
                   o.createdAt?.toDate   ? o.createdAt.toDate() :
                   o.updatedAt           ? new Date(o.updatedAt) :
                   o.orderDate           ? new Date(o.orderDate) :
                   o.timestamp           ? new Date(o.timestamp) : null;

        if (!ts || isNaN(ts.getTime()) || !isToday(ts)) return;
        const patientLabel = o.customerName || o.patient || 'Customer';
        const status = o.status || 'Updated';
        const color = status === 'Dispatched' ? 'bg-blue-500' :
                      status === 'Cancelled'  ? 'bg-red-400'  : 'bg-amber-400';
        entries.push({
          ts, color,
          text: `Online order ${status} - ${patientLabel}`,
          highlight: status,
          highlightColor: status === 'Dispatched' ? 'text-blue-600' :
                          status === 'Cancelled'  ? 'text-red-500'  : 'text-amber-600',
        });
      });

      returns.slice(-10).forEach(r => {
        const ts = r.requestedAt ? new Date(r.requestedAt) :
                   r.createdAt  ? new Date(r.createdAt)   : null;
        if (!ts || isNaN(ts) || !isToday(ts)) return;
        const color = r.status === 'Approved' ? 'bg-emerald-400' :
                      r.status === 'Rejected' ? 'bg-red-400'     : 'bg-slate-400';
        entries.push({
          ts, color,
          text: `Return request ${r.status || 'Pending'} - ${r.itemName || r.medicineName || 'Item'}`,
          highlight: r.status || 'Pending',
          highlightColor: r.status === 'Approved' ? 'text-emerald-600' :
                          r.status === 'Rejected' ? 'text-red-500'     : 'text-slate-500',
        });
      });

      entries.sort((a, b) => a.ts - b.ts);
      const formatted = entries.slice(-15).map(e => ({
        ...e,
        timeLabel: e.ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }));
      if (formatted.length > 0) setActivityLog(formatted);
      setLastUpdated(new Date());

    } catch(e) {
      console.error('Dashboard unified fetch error:', e);
    }
  };

  const fetchInventoryData = async () => {
     try {
         let inv = await getInventory();
         
         setTotalInventoryCount(inv.length);
         
         // Low stock: qty < 100
         const lowStock = inv.filter(item => {
            const qty = Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0);
            return qty < 100;
         });
         setLowStockItems(lowStock);
         
         // Expiring: within 7 days (or already expired)
         const today = new Date();
         today.setHours(0, 0, 0, 0);
         const inOneWeek = new Date(today);
         inOneWeek.setDate(inOneWeek.getDate() + 7);
         
         const expiringList = inv.filter(item => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            if (!dateStr) return false;
            const expDate = new Date(dateStr);
            expDate.setHours(0, 0, 0, 0);
            return expDate <= inOneWeek;
         });
         setExpiringItems(expiringList);
     } catch(e) {
         console.error("Error loading inventory from Firebase:", e);
         setLowStockItems([]);
         setExpiringItems([]);
         setTotalInventoryCount(0);
     }
  };

  // fetchReturnsData removed — now handled inside fetchAllDashboardData to avoid duplicate calls

  // --- Helper: is this timestamp from today? ---
  const isToday = (ts) => {
    if (!ts || isNaN(ts)) return false;
    const now = new Date();
    return ts.getFullYear() === now.getFullYear() &&
           ts.getMonth()    === now.getMonth()    &&
           ts.getDate()     === now.getDate();
  };

  // fetchActivityLog removed — activity log is now built inside fetchAllDashboardData
  // to avoid duplicate getDispensedHistory / getOnlineOrders / getReturnRequests calls

  useEffect(() => {
    // Single unified call on mount — fetches each API endpoint only ONCE
    fetchAllDashboardData();
    fetchInventoryData();
    updatePatientCount();

    // 1-second live clock (no API calls, local only)
    const clockTimer = setInterval(() => {
      setClockDisplay(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }, 1000);

    // Event-driven updates only — no polling timers that hammer the API
    const handleUpdate = () => fetchAllDashboardData();
    window.addEventListener('revenue_updated',    handleUpdate);
    window.addEventListener('dispensed_updated',  handleUpdate);
    window.addEventListener('inventory_updated',  fetchInventoryData);
    window.addEventListener('patient_registered', updatePatientCount);

    // --- Firebase onSnapshot - prescriptions real-time (single listener) ------
    const prescQ = query(
      collection(db, 'prescriptions'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubPrescriptions = onSnapshot(prescQ, (snap) => {
      const prescEntries = snap.docs.map(doc => {
        const d = doc.data();
        const ts = d.createdAt?.toDate ? d.createdAt.toDate() :
                   d.createdAt ? new Date(d.createdAt) : new Date();
        if (!isToday(ts)) return null;
        const status = d.status || 'Submitted';
        const color  = status === 'Verified'  ? 'bg-emerald-500' :
                       status === 'Dispensed' ? 'bg-blue-500'    :
                       status === 'Rejected'  ? 'bg-red-400'     : 'bg-indigo-400';
        const hlColor = status === 'Verified'  ? 'text-emerald-600' :
                        status === 'Dispensed' ? 'text-blue-600'    :
                        status === 'Rejected'  ? 'text-red-500'     : 'text-indigo-500';
        const patient = d.patientName || d.customerName || d.uploadedBy || 'Patient';
        return {
          ts, color,
          text: `Prescription ${status} - ${patient}`,
          highlight: status,
          highlightColor: hlColor,
          timeLabel: ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
      }).filter(Boolean);

      setActivityLog(prev => {
        const merged = [...prescEntries, ...prev.filter(p =>
          !prescEntries.some(pe => pe && pe.text === p.text && pe.timeLabel === p.timeLabel)
        )];
        merged.sort((a, b) => a.ts - b.ts);
        return merged.slice(-30);
      });
      setLastUpdated(new Date());
    }, (err) => console.error('Firestore prescriptions listen error:', err));

    // --- Firebase onSnapshot - general notifications real-time ----------------
    const notifQ = query(
      collection(db, 'pharmacistNotifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubNotifications = onSnapshot(notifQ, (snap) => {
      const notifEntries = snap.docs.map(doc => {
        const d = doc.data();
        const ts = d.createdAt?.toDate ? d.createdAt.toDate() :
                   d.createdAt ? new Date(d.createdAt) : new Date();
        if (!isToday(ts)) return null;
        
        const color = d.colorType === 'emerald' ? 'bg-emerald-500' :
                      d.colorType === 'red'     ? 'bg-red-400'     :
                      d.colorType === 'blue'    ? 'bg-blue-400'    : 'bg-slate-400';
                      
        const hlColor = d.colorType === 'emerald' ? 'text-emerald-600' :
                        d.colorType === 'red'     ? 'text-red-500'     :
                        d.colorType === 'blue'    ? 'text-blue-600'    : 'text-slate-500';

        return {
          ts, color,
          text: d.message || d.title,
          highlight: d.title,
          highlightColor: hlColor,
          timeLabel: ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
      }).filter(Boolean);

      setActivityLog(prev => {
        const merged = [...notifEntries, ...prev.filter(p =>
          !notifEntries.some(ne => ne && ne.text === p.text && ne.timeLabel === p.timeLabel)
        )];
        merged.sort((a, b) => a.ts - b.ts);
        return merged.slice(-30);
      });
      setLastUpdated(new Date());
    });

    return () => {
      window.removeEventListener('revenue_updated',    handleUpdate);
      window.removeEventListener('dispensed_updated',  handleUpdate);
      window.removeEventListener('inventory_updated',  fetchInventoryData);
      window.removeEventListener('patient_registered', updatePatientCount);
      clearInterval(clockTimer);
      unsubPrescriptions();
      unsubNotifications();
    };
  }, []);

  // Auto-scroll to bottom when new log entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityLog]);

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const walkinTotal = walkinRxRev + walkinOtcRev;
  const onlineTotal = onlinePaidRev + onlineCodRev;
  const circ = 314.16; // 2 * PI * 50
  
  const walkinRxDash = walkinTotal > 0 ? (walkinRxRev / walkinTotal) * circ : 0;
  const walkinOtcDash = walkinTotal > 0 ? (walkinOtcRev / walkinTotal) * circ : 0;

  const cardDashQueue = dailyRevenue > 0 ? (onlineRevCard / dailyRevenue) * circ : 0;
  const bankDashQueue = dailyRevenue > 0 ? (onlineRevBank / dailyRevenue) * circ : 0;
  const payHereDashQueue = dailyRevenue > 0 ? (onlineRevPayHere / dailyRevenue) * circ : 0;
  const codDashQueue = dailyRevenue > 0 ? (onlineRevCod / dailyRevenue) * circ : 0;

  // Online Prescriptions simplified: Paid = Card+Bank+PayHere grouped, COD separate
  const onlinePrescPaidRev = onlineRevCard + onlineRevBank + onlineRevPayHere;
  const prescPaidDash = dailyRevenue > 0 ? (onlinePrescPaidRev / dailyRevenue) * circ : 0;
  const prescCodDash  = dailyRevenue > 0 ? (onlineRevCod / dailyRevenue) * circ : 0;

  const paidDash = onlineTotal > 0 ? (onlinePaidRev / onlineTotal) * circ : 0;
  const codDash = onlineTotal > 0 ? (onlineCodRev / onlineTotal) * circ : 0;

  const physicalWidth = dispensedTodayCount > 0 ? (physicalDispensedCount / dispensedTodayCount) * 100 : 0;
  const onlineWidth = dispensedTodayCount > 0 ? (onlineDispensedCount / dispensedTodayCount) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacist Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 shadow-sm">
          <Calendar className="w-4 h-4" />
          {currentDate}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 items-stretch">

        {/* Card 1 - Dispensed Today (Emerald) */}
        <div
          className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)] border border-slate-100"
          onClick={() => navigate('/pharmacist/dispensed-today')}
        >
          <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-emerald-600" />
          <div className="pl-5 pr-5 pt-5 pb-5 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-500">Dispensed Today</p>
              <div className="bg-emerald-50 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-slate-800 my-3">{dispensedTodayCount}</h2>
            <div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${physicalWidth}%` }} />
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${onlineWidth}%` }} />
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-[10px] text-slate-400 font-semibold">Physical ({physicalDispensedCount})</span></div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-400 font-semibold">Online ({onlineDispensedCount})</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 - Total Patients (Blue) */}
        <div
          className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.18)] border border-slate-100"
          onClick={() => navigate('/pharmacist/new-patients')}
        >
          <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-400 to-blue-600" />
          <div className="pl-5 pr-5 pt-5 pb-5 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-500">Registered Customers</p>
              <span className="bg-blue-50 text-blue-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Registered</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-800 my-3">{totalPatientsCount}</h2>
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                <Inbox className="w-4 h-4 text-blue-500" strokeWidth={2} />
              </div>
              <p className="text-[12px] text-slate-400 font-medium">App registered customers</p>
            </div>
          </div>
        </div>

        {/* Card 3 - Low Stock (Orange) — qty<100 total, qty<20 critical */}
        {(() => {
          const criticalCount = lowStockItems.filter(item => Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0) < 20).length;
          return (
            <div
              className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(249,115,22,0.18)] border border-slate-100"
              onClick={() => navigate('/pharmacist/low-stock')}
            >
              <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-orange-400 to-orange-600" />
              <div className="pl-5 pr-5 pt-5 pb-5 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-slate-500">Low Stock Items</p>
                  {lowStockItems.length > 0
                    ? <span className="bg-orange-50 text-orange-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Alert</span>
                    : <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">OK</span>
                  }
                </div>
                <h2 className="text-4xl font-bold text-slate-800 my-2">{lowStockItems.length}</h2>
                <div>
                  {lowStockItems.length > 0 ? (
                    <>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                        <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min((lowStockItems.length / Math.max(totalInventoryCount, 1)) * 100, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold">&lt;100 items</span>
                        {criticalCount > 0 && (
                          <span className="flex items-center gap-1 bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {criticalCount} critical (&lt;20)
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-400 font-medium">Inventory levels are stable</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 4 - Expiring Soon (Red) — 7-day window */}
        {(() => {
          const expiredCount = expiringItems.filter(item => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            if (!dateStr) return false;
            const d = new Date(dateStr); d.setHours(0,0,0,0);
            const t = new Date(); t.setHours(0,0,0,0);
            return d < t;
          }).length;
          return (
            <div
              className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(239,68,68,0.18)] border border-slate-100"
              onClick={() => navigate('/pharmacist/expiring-inventory')}
            >
              <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-red-400 to-red-600" />
              <div className="pl-5 pr-5 pt-5 pb-5 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-slate-500">Expiring (7 days)</p>
                  {expiringItems.length > 0
                    ? <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Action</span>
                    : <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">OK</span>
                  }
                </div>
                <h2 className="text-4xl font-bold text-slate-800 my-2">{expiringItems.length}</h2>
                <div>
                  {expiringItems.length > 0 ? (
                    <>
                      <div className="flex gap-1.5 flex-wrap mb-1">
                        {expiringItems.slice(0, 4).map((item, idx) => (
                          <span key={idx} className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-500 border border-red-100 flex-shrink-0" title={item.name}>
                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        ))}
                        {expiringItems.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-bold self-center">+{expiringItems.length - 4}</span>
                        )}
                      </div>
                      {expiredCount > 0 && (
                        <span className="text-[10px] text-red-500 font-bold">{expiredCount} already expired</span>
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] text-slate-400 font-medium">No near-expirations this week</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="col-span-2 space-y-6">

          {/* Today's Revenue Overview */}
          <div>
            {/* Header - outside the card, exactly like the screenshot */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Today's Revenue Overview</h3>
              <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                Total: Rs. {(dailyRevenue + walkinTotal + onlineTotal).toFixed(0)}
              </span>
            </div>

            {/* Card - circles only inside */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-3 divide-x divide-slate-100">

              {/* (1) Online Prescriptions */}
              <div className="flex flex-col items-center px-6 py-6">
                <div className="h-0.5 w-16 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 mb-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-5 text-center">Online Prescriptions</h4>
                <div className="flex items-center justify-center relative mb-5">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${prescPaidDash} ${circ}`} strokeDashoffset={0} className="text-blue-600" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${prescCodDash} ${circ}`} strokeDashoffset={-prescPaidDash} className="text-amber-400" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold text-slate-400">Rs.</span>
                    <span className="text-xl font-black text-slate-800">{dailyRevenue.toFixed(0)}</span>
                  </div>
                </div>
                <div className="w-full flex justify-center gap-8 pt-4 border-t border-slate-100">
                  {[
                    { color: 'bg-blue-600',  label: 'Paid', val: onlinePrescPaidRev },
                    { color: 'bg-amber-400', label: 'COD',  val: onlineRevCod },
                  ].map(({ color, label, val }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Rs. {(val/1000).toFixed(1)}k</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* (2) Online Other Order - CENTER */}
              <div className="flex flex-col items-center px-6 py-6">
                <div className="h-0.5 w-16 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 mb-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-5 text-center">Online Other Order</h4>
                <div className="flex items-center justify-center relative mb-5">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${paidDash} ${circ}`} strokeDashoffset={0} className="text-emerald-500" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${codDash} ${circ}`} strokeDashoffset={-paidDash} className="text-amber-400" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold text-slate-400">Rs.</span>
                    <span className="text-xl font-black text-slate-800">{onlineTotal.toFixed(0)}</span>
                  </div>
                </div>
                <div className="w-full flex justify-center gap-8 pt-4 border-t border-slate-100">
                  {[
                    { color: 'bg-emerald-500', label: 'Paid', val: onlinePaidRev },
                    { color: 'bg-amber-400',   label: 'COD',  val: onlineCodRev },
                  ].map(({ color, label, val }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Rs. {(val/1000).toFixed(1)}k</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* (3) Walk-in POS */}
              <div className="flex flex-col items-center px-6 py-6">
                <div className="h-0.5 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-400 mb-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-5 text-center">Walk-in POS</h4>
                <div className="flex items-center justify-center relative mb-5">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${walkinRxDash} ${circ}`} strokeDashoffset={0} className="text-purple-600" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                    <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${walkinOtcDash} ${circ}`} strokeDashoffset={-walkinRxDash} className="text-pink-400" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold text-slate-400">Rs.</span>
                    <span className="text-xl font-black text-slate-800">{walkinTotal.toFixed(0)}</span>
                  </div>
                </div>
                <div className="w-full flex justify-center gap-8 pt-4 border-t border-slate-100">
                  {[
                    { color: 'bg-purple-600', label: 'Rx Meds', val: walkinRxRev },
                    { color: 'bg-pink-400',   label: 'OTC+Gen', val: walkinOtcRev },
                  ].map(({ color, label, val }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Rs. {(val/1000).toFixed(1)}k</p>
                    </div>
                  ))}
                </div>
              </div>

              </div>{/* end grid */}
            </div>{/* end card */}
          </div>{/* end outer wrapper */}

        </div>{/* End Left Column col-span-2 */}

        {/* Right Column (Recent Activity & Alerts) */}
        <div className="space-y-6">
          
          {pendingReturns > 0 && (
            <div 
               className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
               onClick={() => navigate('/pharmacist/returns')}
            >
               <div className="flex items-center gap-3 mb-2">
                 <div className="bg-amber-500 text-white p-1.5 rounded-lg">
                    <Inbox className="w-5 h-5" />
                 </div>
                 <h3 className="font-bold text-amber-900">Return Requests</h3>
               </div>
               <p className="text-sm text-amber-700 font-medium">You have <span className="font-black text-amber-900">{pendingReturns}</span> pending return requests that need your attention.</p>
               <button className="mt-3 text-xs font-bold text-amber-600 uppercase tracking-wider hover:text-amber-800">Review Now &rarr;</button>
            </div>
          )}

          {/* Activity section - header outside card, same as Revenue Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Today's Activity</h3>
                {lastUpdated && (
                  <span className="text-[10px] text-slate-400">
                    {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400">{clockDisplay}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Live</span>
              </div>
            </div>

            <div className="card pt-4 pb-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No activity today yet.</p>
              ) : (
                <>
                  <div
                    ref={scrollRef}
                    className="overflow-y-auto transition-all duration-300 pr-1"
                    style={{ maxHeight: showAllLogs ? '420px' : '260px' }}
                  >
                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-5 pb-2">
                      {(showAllLogs ? activityLog : activityLog.slice(0, 4)).map((entry, idx) => (
                        <div key={idx} className="relative pl-6">
                          <span className={`absolute w-3 h-3 ${entry.color} rounded-full -left-[7px] top-1 border-2 border-white`} />
                          <p className="text-xs text-slate-400 font-medium">{entry.timeLabel}</p>
                          <p className="text-sm text-slate-700 mt-0.5">
                            {entry.text.substring(0, entry.text.indexOf(entry.highlight))}
                            <span className={`font-semibold ${entry.highlightColor}`}>{entry.highlight}</span>
                            {entry.text.substring(entry.text.indexOf(entry.highlight) + entry.highlight.length)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAllLogs(!showAllLogs)}
                    className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 mt-3 py-2 border-t border-slate-100 transition-colors"
                  >
                    {showAllLogs ? 'View Less ^' : `View All (${activityLog.length}) v`}
                  </button>
                </>
              )}
            </div>
          </div>{/* end activity section */}


        </div>{/* end right column */}

      </div>
    </div>
  );
};

export default PharmacistDashboard;
