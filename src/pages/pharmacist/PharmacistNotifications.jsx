import React, { useState, useEffect, useContext } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  PackagePlus, 
  Tags,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Bell,
  Package,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertContext } from '../../layouts/PharmacistLayout';
import { getInventory, getPrescriptions, getOnlineOrders } from '../../services/pharmacistService';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';

const PharmacistNotifications = () => {
  const navigate = useNavigate();
  const { setUnreadAlerts } = useContext(AlertContext);
  
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
         const inventory = await getInventory();
         const prescriptions = await getPrescriptions();
         const onlineOrders = await getOnlineOrders();
         
         // Fetch dismissed IDs from Firestore
         let dismissedIds = [];
         const configRef = doc(db, 'pharmacistConfig', 'notifications');
         const configSnap = await getDoc(configRef);
         if (configSnap.exists()) {
             dismissedIds = configSnap.data().dismissedIds || [];
         } else {
             await setDoc(configRef, { dismissedIds: [] });
         }

         let newNotifs = [];

         // 1. Inventory Notifications
         inventory.forEach(item => {
            const stock = parseInt(item.stock);
            // Low stock
            if (stock <= 30 && stock > 0) {
               newNotifs.push({
                  id: `inv-low-${item.id}`,
                  type: 'inventory_low',
                  category: 'Warning',
                  title: 'Stock Reorder Warning',
                  subtitle: `Category: ${item.category} • Current Stock: ${stock}`,
                  message: `${item.name} is nearing its minimum threshold with only ${stock} units remaining.`,
                  icon: <Clock className="w-5 h-5" />,
                  colorType: 'amber',
                  date: new Date().getTime() - 10000 // Just a generic timestamp for sorting
               });
            } else if (stock === 0) {
               newNotifs.push({
                  id: `inv-crit-${item.id}`,
                  type: 'inventory_critical',
                  category: 'Urgent',
                  title: 'Critical Low Stock',
                  subtitle: `Category: ${item.category} • Empty`,
                  message: `${item.name} stock has fallen to 0. Please order immediately.`,
                  icon: <AlertTriangle className="w-5 h-5" />,
                  colorType: 'red',
                  date: new Date().getTime() - 5000 
               });
            }

            // Expiring
            if (item.expiryDate) {
               const expD = new Date(item.expiryDate).getTime();
               const nowD = new Date().getTime();
               const daysDiff = (expD - nowD)/(1000*3600*24);
               if (daysDiff < 30 && daysDiff >= 0) {
                  newNotifs.push({
                     id: `inv-exp-${item.id}`,
                     type: 'inventory_expiring',
                     category: 'Alert',
                     title: 'Expiring Inventory',
                     subtitle: `Expires in ${Math.ceil(daysDiff)} days`,
                     message: `${item.name} will expire on ${item.expiryDate}. Please clear the stock.`,
                     icon: <AlertTriangle className="w-5 h-5" />,
                     colorType: 'red',
                     date: new Date().getTime() - 15000 
                  });
               }
            }
         });

         // 2. Prescription Notifications
         prescriptions.forEach(rx => {
            if (rx.status === 'New' || rx.status === 'In Review') {
               newNotifs.push({
                  id: `rx-new-${rx.id}`,
                  type: 'prescription_new',
                  category: 'Pending',
                  title: 'New Rx Prescription',
                  subtitle: `Patient: ${rx.patientName}`,
                  message: `Prescription #${rx.id} is waiting for your review and verification.`,
                  icon: <FileText className="w-5 h-5" />,
                  colorType: 'blue',
                  date: parseInt(rx.timestamp || new Date().getTime()),
                  linkId: rx.id
               });
            } else if (rx.status === 'Flagged') {
               newNotifs.push({
                  id: `rx-flag-${rx.id}`,
                  type: 'prescription_flagged',
                  category: 'Urgent',
                  title: 'Flagged Prescription',
                  subtitle: `Patient: ${rx.patientName}`,
                  message: `Prescription #${rx.id} has been flagged for issues. Needs immediate resolution.`,
                  icon: <FileText className="w-5 h-5" />,
                  colorType: 'amber',
                  date: parseInt(rx.timestamp || new Date().getTime()),
                  linkId: rx.id
               });
            }
         });

         // 3. Online Orders Notifications
         onlineOrders.forEach(o => {
            if (o.status === 'Reviewing' || o.status === 'New') {
               newNotifs.push({
                  id: `ord-new-${o.id}`,
                  type: 'order_new',
                  category: 'Pending',
                  title: 'New Online Order',
                  subtitle: `Customer: ${o.patient}`,
                  message: `Online order ${o.id} requires confirmation and packing.`,
                  icon: <Package className="w-5 h-5" />,
                  colorType: 'emerald',
                  date: new Date().getTime() // just map latest
               });
            }
         });

         // Sort by date (newest first)
         newNotifs.sort((a,b) => b.date - a.date);
         
         // Filter out any that were already dismissed
         const filteredNotifs = newNotifs.filter(n => !dismissedIds.includes(n.id));
         
         setNotifications(filteredNotifs);
         setIsLoading(false);
      } catch (error) {
         console.error("Error generating notifications:", error);
         setIsLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!isLoading) {
       setUnreadAlerts(0);
       localStorage.setItem('pharmacist_notif_viewed_at', Date.now().toString());
    }
  }, [isLoading, setUnreadAlerts]);

  const dismissNotification = async (id) => {
    // Add to local state
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Add to Firestore persistent storage
    try {
      const configRef = doc(db, 'pharmacistConfig', 'notifications');
      await setDoc(configRef, { dismissedIds: arrayUnion(id) }, { merge: true });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleAction = (type, linkId) => {
    if (type.includes('inventory')) {
       navigate('/pharmacist/inventory');
    } else if (type.includes('prescription')) {
       navigate(linkId ? `/pharmacist/verification/${linkId}` : '/pharmacist/prescriptions');
    } else if (type.includes('order')) {
       navigate('/pharmacist/online-orders');
    }
  };

  const getColorClasses = (type) => {
    switch(type) {
      case 'red': return { bg: 'bg-red-50', text: 'text-red-500', border: '!border-l-red-500', badgeNode: 'bg-red-500 text-white' };
      case 'amber': return { bg: 'bg-amber-50', text: 'text-amber-500', border: '!border-l-amber-500', badgeNode: 'bg-amber-500 text-white' };
      case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-500', border: '!border-l-blue-500', badgeNode: 'bg-blue-500 text-white' };
      case 'emerald': return { bg: 'bg-emerald-50', text: 'text-emerald-500', border: '!border-l-emerald-500', badgeNode: 'bg-emerald-500 text-white' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: '!border-l-slate-500', badgeNode: 'bg-slate-500 text-white' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] -m-6 relative overflow-hidden">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 h-full">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800">Notifications</h1>
              <p className="text-slate-500 font-medium mt-1">Review unified alerts from Inventory, Prescriptions, and Online Hub.</p>
            </div>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> {notifications.length} Pending
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            
            {/* Notifications List */}
            <div className="space-y-4">
              
              {isLoading ? (
                  <div className="text-center p-8 text-slate-400">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="bg-emerald-50 text-emerald-600 p-8 rounded-2xl text-center border border-emerald-100">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3 className="font-bold text-lg">All caught up!</h3>
                  <p className="text-sm font-medium opacity-80 mt-1">There are no pending alerts or notifications requiring your attention.</p>
                </div>
              ) : (
                notifications.map(notif => {
                   const c = getColorClasses(notif.colorType);
                   return (
                     <div key={notif.id} className={`card ${c.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4 items-start">
                            <div className={`${c.bg} ${c.text} p-2 rounded-lg mt-0.5`}>
                              {notif.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{notif.title}</h3>
                              <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">{notif.subtitle}</p>
                            </div>
                          </div>
                          <span className={`${c.badgeNode} text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider shadow-sm`}>{notif.category}</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 ml-14 mb-4">
                           <p className="text-sm text-slate-600 font-medium">{notif.message}</p>
                        </div>

                        <div className="flex items-center gap-3 ml-14">
                           <button onClick={() => handleAction(notif.type, notif.linkId)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm">
                             Review Action
                           </button>
                           <button onClick={() => dismissNotification(notif.id)} className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm px-5 py-2 rounded-md hover:bg-emerald-100 flex items-center gap-2 transition-colors shadow-sm">
                             <CheckCircle2 size={16} /> Mark as Resolved
                           </button>
                        </div>
                     </div>
                   );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistNotifications;
