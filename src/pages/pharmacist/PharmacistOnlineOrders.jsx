import React, { useState } from 'react';
import { 
  Package, 
  FileText, 
  Search, 
  ShoppingBag,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const mockPrescriptionOrders = [
  { id: 'RX-O-8821', patient: 'Sarah Jenkins', type: 'Digital RX', date: 'Today, 09:12 AM', status: 'Pending Review', items: 'Lisinopril 10mg' },
  { id: 'RX-O-8822', patient: 'Michael Chen', type: 'RX Upload', date: 'Today, 10:45 AM', status: 'In Process', items: 'Metformin 500mg' },
  { id: 'RX-O-8825', patient: 'Alisha Smith', type: 'Digital RX', date: 'Yesterday', status: 'Ready', items: 'Amoxicillin 500mg' },
  { id: 'RX-O-8828', patient: 'David Bowman', type: 'RX Upload', date: 'Yesterday', status: 'Pending Review', items: 'Atorvastatin 20mg' },
];

const mockGeneralOrders = [
  { id: 'GEN-4412', patient: 'Emma Watson', items: 'Vitamin C 1000mg (x2), Paracetamol 500mg', date: 'Today, 11:30 AM', status: 'Packing' },
  { id: 'GEN-4413', patient: 'David Blake', items: 'First Aid Kit, Bandages', date: 'Today, 08:15 AM', status: 'Shipped' },
  { id: 'GEN-4419', patient: 'Sarah Jenkins', items: 'Cough Syrup 150ml', date: 'Yesterday', status: 'Delivered' },
  { id: 'GEN-4422', patient: 'Robert King', items: 'Whey Protein 1kg, Multivitamins', date: 'Yesterday', status: 'Packing' },
];

const PharmacistOnlineOrders = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending Review': return 'bg-amber-100 text-amber-700';
      case 'In Process':
      case 'Packing': return 'bg-blue-100 text-blue-700';
      case 'Ready':
      case 'Delivered': return 'bg-emerald-100 text-emerald-700';
      case 'Shipped': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/pharmacist/prescriptions')}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Online Orders Hub
          </h1>
          <p className="text-slate-500 mt-1">Manage incoming digital prescriptions and general OTC orders.</p>
        </div>
      </div>

      <div className="card shadow-sm p-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button 
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'prescriptions' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            <FileText className="w-4 h-4" />
            Prescription Orders ({mockPrescriptionOrders.length})
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'general' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
            onClick={() => setActiveTab('general')}
          >
            <ShoppingBag className="w-4 h-4" />
            General Orders ({mockGeneralOrders.length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
          <div className="relative w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder={`Search ${activeTab === 'prescriptions' ? 'prescriptions...' : 'general orders...'}`}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
             />
          </div>
        </div>

        {/* Dynamic Table Area */}
        <div className="table-container shadow-none border-0 rounded-none bg-white">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Order ID</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Customer</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Items / Type</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Date Received</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Status</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'prescriptions' && mockPrescriptionOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">{order.patient}</td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-slate-700">{order.type}</p>
                     <p className="text-xs text-slate-500">{order.items}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1 mt-2.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {order.date}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 font-bold text-sm hover:underline">Process</button>
                  </td>
                </tr>
              ))}
              
              {activeTab === 'general' && mockGeneralOrders.map((order, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">{order.patient}</td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-medium text-slate-600 max-w-[200px] truncate" title={order.items}>{order.items}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {order.date}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 font-bold text-sm hover:underline">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PharmacistOnlineOrders;

