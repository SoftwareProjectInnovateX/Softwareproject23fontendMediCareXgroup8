import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ArrowLeft,
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistNewPatients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [initialData, setInitialData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
     import('../../services/pharmacistService').then(({ getPatients }) => {
        getPatients().then(pts => {
           setInitialData(pts);
           setIsLoading(false);
        }).catch(e => {
           console.error("Failed to fetch patients:", e);
           setIsLoading(false);
        });
     });
  }, []);

  // 1. Logic to prevent showing people with the same name (Validation)
  const uniquePatients = useMemo(() => {
    const seenNames = new Set();
    return initialData.filter(patient => {
      const nameKey = (patient.name || '').toLowerCase();
      // Checks if the name is already in the list
      const isDuplicate = seenNames.has(nameKey);
      seenNames.add(nameKey);
      return !isDuplicate; // If already exists, do not add to the list
    });
  }, [initialData]);

  // 2. Search feature (Search Logic) - Shows instantly when name or ID is typed
  const filteredPatients = useMemo(() => {
    return uniquePatients.filter(patient => 
      (patient.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (patient.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, uniquePatients]);

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
            Total Patient Directory
          </h1>
          <p className="text-slate-500 mt-1">Showing {filteredPatients.length} unique registered patients.</p>
        </div>
      </div>

      <div className="card shadow-sm p-0 overflow-hidden bg-white border border-slate-200 rounded-xl">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Enter patient name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Patient Details</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{patient.name}</p>
                          <p className="text-xs text-slate-500 font-medium">ID: {patient.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {patient.dob} <span className="text-slate-400 ml-1">({patient.age}y)</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${(patient.activeCount && patient.activeCount > 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {(patient.activeCount && patient.activeCount > 0) ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <button 
                        onClick={() => navigate('/pharmacist/patients', { state: { searchTarget: patient.id } })} 
                        className="text-blue-600 font-bold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         View Profile
                       </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <p className="text-slate-400 italic">No such patient found.</p>
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

export default PharmacistNewPatients;