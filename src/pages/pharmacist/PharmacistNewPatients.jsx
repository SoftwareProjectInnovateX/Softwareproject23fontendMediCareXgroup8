import React from 'react';
import { 
  Search, 
  ArrowLeft,
  Clock,
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistNewPatients = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/pharmacist/dashboard')}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            New PharmacistPatients
          </h1>
          <p className="text-slate-500 mt-1">Showing 24 patients registered in the last 7 days.</p>
        </div>
      </div>

      <div className="card shadow-sm p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search new patients..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          <div className="flex gap-2">
             <button className="bg-white border border-slate-200 text-slate-600 text-sm font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Export List
             </button>
          </div>
        </div>
        
        <div className="table-container shadow-none border-0 rounded-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Registered At</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Michael Chen', id: '#992104', dob: 'Jan 05, 1965', phone: '(555) 321-4567', time: '4 mins ago', tag: 'New Today' },
                { name: 'Sarah Jenkins', id: '#849302', dob: 'Oct 12, 1982', phone: '(555) 123-4567', time: '2 hours ago', tag: 'New Today' },
                { name: 'David Bowman', id: '#774621', dob: 'Jun 22, 1978', phone: '(555) 789-0123', time: 'Yesterday, 4:30 PM', tag: '' },
                { name: 'Eleanor Rigby', id: '#112933', dob: 'Mar 15, 1948', phone: '(555) 456-7890', time: 'Oct 10, 2023', tag: '' }
              ].map((patient, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{patient.name}</p>
                        <p className="text-xs text-slate-500 font-medium">ID: {patient.id} • DOB: {patient.dob}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{patient.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-sm text-slate-600 font-medium">{patient.time}</span>
                       {patient.tag && (
                         <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-1">
                           {patient.tag}
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <button 
                      onClick={() => navigate('/pharmacist/patients')} 
                      className="text-blue-600 font-bold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       View Profile
                     </button>
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

export default PharmacistNewPatients;

