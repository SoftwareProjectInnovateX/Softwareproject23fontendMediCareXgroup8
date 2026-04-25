import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, CheckCircle, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistDispensedToday = () => {
  const navigate = useNavigate();
  const [dispensedSummary, setDispensedSummary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
     try {
        const dispensedJSON = localStorage.getItem('medicarex_dispensed_today');
        if (dispensedJSON) {
           const dispensedList = JSON.parse(dispensedJSON);
           const todayStr = new Date().toDateString();
           const todaysList = dispensedList.filter(item => item.dispensedDate === todayStr);
           setDispensedSummary(todaysList);
        }
     } catch(e) {}
  }, []);

  const filteredSummary = dispensedSummary.filter(item => 
     item.rxId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.verifiedPatient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (item.patientId && item.patientId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRevenue = filteredSummary.reduce((acc, item) => acc + (item.total || 0), 0);
  const totalItemsDispensed = filteredSummary.reduce((acc, item) => acc + (item.orderItems?.length || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 ">Dispensed Today</h1>
          <p className="text-slate-500 mt-1">Review completed prescriptions and payments for today</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card bg-emerald-50 border-emerald-100 ">
          <p className="text-sm font-medium text-emerald-600 ">Total Patients Today</p>
          <h2 className="text-3xl font-bold text-emerald-700 mt-1">{filteredSummary.length}</h2>
        </div>
        <div className="card bg-blue-50 border-blue-100 ">
          <p className="text-sm font-medium text-blue-600 ">Items Dispensed</p>
          <h2 className="text-3xl font-bold text-blue-700 mt-1">{totalItemsDispensed}</h2>
        </div>
        <div className="card bg-amber-50 border-amber-100 ">
          <p className="text-sm font-medium text-amber-600 ">Total Revenue</p>
          <h2 className="text-3xl font-bold text-amber-700 mt-1">Rs. {totalRevenue.toFixed(2)}</h2>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 ">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 " />
            <input 
              type="text" 
              placeholder="Search by Invoice, Patient, or Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 " 
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
            Export Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 ">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice / Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Items Type</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 ">
              {filteredSummary.length > 0 ? filteredSummary.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-800 ">#{item.rxId}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.dispensedTime || 'Just now'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 ">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 ">{item.verifiedPatient}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.patientId || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 ">
                      <FileText className="w-3 h-3" />
                      {item.orderItems?.length || 0} item(s)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-slate-800 ">Rs. {item.total?.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 ">
                      <CheckCircle className="w-3 h-3" />
                      Paid
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan="5" className="py-12 text-center text-slate-400">
                     <p>No dispensed prescriptions found for today.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDispensedToday;

