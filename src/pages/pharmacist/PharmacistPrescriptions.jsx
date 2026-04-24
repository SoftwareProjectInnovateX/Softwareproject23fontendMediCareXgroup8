import React, { useState, useEffect } from 'react';
import { 
  PlayCircle,
  Inbox, 
  ClipboardList, 
  HelpCircle, 
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Smartphone,
  PenTool,
  AlertTriangle,
  Package,
  ShoppingBag
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertContext } from '../../layouts/PharmacistLayout';
import { useContext } from 'react';

// mockTableData and generatedTableData removed to ensure pure Firebase data

const PharmacistPrescriptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateQueueCount } = useContext(AlertContext);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('Priority: All');
  const [dynamicTableData, setDynamicTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let intervalId;
    const fetchRx = () => {
       import('../../services/pharmacistService').then(({ getPrescriptions, addPrescription }) => {
          getPrescriptions().then(async (rxData) => {
              setDynamicTableData(rxData.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)));
              setIsLoading(false);
          }).catch((e) => {
              console.error(e);
              setIsLoading(false);
          });
       });
    };

    fetchRx(); // Initial fetch
    // Changed polling to 30 seconds to prevent Firebase quota exhaustion
    intervalId = setInterval(fetchRx, 30000); 

    return () => {
       if (intervalId) clearInterval(intervalId);
    };
  }, []);


  const [walkinRxCount, setWalkinRxCount] = useState(0);

  useEffect(() => {
    const fetchWalkinCount = () => {
      try {
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem('medicarex_revenue_date');
        if (savedDate === today) {
          const count = parseInt(localStorage.getItem('medicarex_walkin_rx_count') || '0');
          setWalkinRxCount(count);
        } else {
          setWalkinRxCount(0);
        }
      } catch(e) {}
    };
    
    fetchWalkinCount();
    window.addEventListener('revenue_updated', fetchWalkinCount);
    return () => window.removeEventListener('revenue_updated', fetchWalkinCount);
  }, []);

  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchTerm(location.state.searchTarget);
      
      const StateObj = { ...location.state };
      delete StateObj.searchTarget;
      window.history.replaceState(StateObj, document.title);
    }
  }, [location]);

  useEffect(() => {
     updateQueueCount();
  }, [dynamicTableData, updateQueueCount]);

  const itemsPerPage = 8;
  
  // Intercept flagged state from PharmacistVerification
  useEffect(() => {
    if (location.state?.flaggedId && location.state?.flaggedPatient) {
      const { flaggedId, flaggedPatient, flagMessage } = location.state;
      
      setDynamicTableData(prev => {
        const foundIndex = prev.findIndex(p => p.id === flaggedId);
        const flaggedRx = {
          id: flaggedId,
          isHighPriority: true,
          patientName: flaggedPatient.name || `${flaggedPatient.firstName} ${flaggedPatient.lastName}`,
          dob: flaggedPatient.dob || 'Unknown',
          isDigital: true,
          dateMain: 'Just Now',
          dateSub: '',
          status: 'Flagged',
          statusStyle: 'bg-amber-100 text-amber-700',
          actionLabel: 'Review',
          rowStyle: 'bg-amber-50 border-l-4 border-amber-500',
          flagMessage: flagMessage
        };

        if (foundIndex >= 0) {
          const newData = [...prev];
          newData[foundIndex] = { ...newData[foundIndex], ...flaggedRx };
          // Move to top
          const item = newData.splice(foundIndex, 1)[0];
          return [item, ...newData];
        } else {
          return [flaggedRx, ...prev];
        }
      });
      
      // Clean up router state so refreshing doesn't duplicate logic
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  const totalVerifiedCount = dynamicTableData.filter(rx => rx.status === 'Verified' || rx.status === 'Completed' || rx.status === 'COMPLETED').length;
  const verifiedPercentage = Math.round((totalVerifiedCount / dynamicTableData.length) * 100);
  const pendingCount = dynamicTableData.filter(rx => rx.status === 'In Review' || rx.status === 'New').length;
  
  const filteredData = dynamicTableData
    .filter(rx => {
      const rxIdDisplay = `#RX-${rx.id}`.toLowerCase();
      const matchesSearch = rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            rxIdDisplay.includes(searchTerm.toLowerCase()) ||
                            rx.id.toLowerCase().includes(searchTerm.toLowerCase());
      const isPendingMatch = statusFilter === 'Pending' && (rx.status === 'In Review' || rx.status === 'New');
      const isVerifiedMatch = statusFilter === 'Verified/Completed' && (rx.status === 'Verified' || rx.status === 'Completed' || rx.status === 'COMPLETED');
      const matchesStatus = statusFilter === 'All Statuses' || rx.status === statusFilter || isPendingMatch || isVerifiedMatch;
      const matchesPriority = priorityFilter === 'Priority: All' || 
                             (priorityFilter === 'High Priority' ? rx.isHighPriority : !rx.isHighPriority);
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      // 1. Flagged items always float to the top
      if (a.status === 'Flagged' && b.status !== 'Flagged') return -1;
      if (a.status !== 'Flagged' && b.status === 'Flagged') return 1;
      
      // 2. If both are flagged, sort by ID ascending (older ones first)
      if (a.status === 'Flagged' && b.status === 'Flagged') {
        return parseInt(a.id) - parseInt(b.id);
      }
      
      // 3. For all other non-flagged items, sort by ID descending (newest first)
      return parseInt(b.id) - parseInt(a.id);
    });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const currentItems = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prescription Workflow Queue</h1>
          <p className="text-slate-500 mt-1">Manage and verify active prescription requests in real-time.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div 
          className="card border-slate-100 shadow-none hover:shadow-md border-l-4 border-l-blue-500 !py-5 relative overflow-hidden group cursor-pointer hover:bg-slate-50 transition-all"
          onClick={() => {
            setStatusFilter('All Statuses');
            setSearchTerm('');
            setPriorityFilter('Priority: All');
          }}
        >
           <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-blue-500 z-20"></div>
           <div className="flex justify-between items-start">
             <div className="bg-blue-50 text-blue-600 p-2 rounded relative z-10">
               <Inbox className="w-5 h-5" />
             </div>
             <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full z-10 flex items-center gap-1 mr-4">
             </span>
           </div>
           <div className="mt-4 z-10 relative">
             <p className="text-sm font-medium text-slate-500">System & Physical Prescriptions</p>
             <h2 className="text-3xl font-bold text-slate-800 mt-1">{dynamicTableData.length}</h2>
             <p className="text-xs text-slate-400 mt-1">Total received so far</p>
           </div>
           <div className="absolute right-0 bottom-0 opacity-5 group-hover:scale-110 transition-transform">
             <Inbox className="w-24 h-24 -mr-6 -mb-6" />
           </div>
        </div>
        <div 
          className="card border border-slate-100 shadow-none hover:shadow-md !py-5 relative cursor-pointer hover:bg-slate-50 transition-all border-l-4 border-l-slate-400"
          onClick={() => {
            setStatusFilter('Pending');
            setSearchTerm('');
            setPriorityFilter('Priority: All'); // Reset other filters if needed
          }}
        >
           <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-slate-400"></div>
           <div className="bg-slate-100 text-slate-600 p-2 rounded inline-block">
             <ClipboardList className="w-5 h-5" />
           </div>
           <div className="mt-4">
             <p className="text-sm font-medium text-slate-500">Pending My Review</p>
             <h2 className="text-3xl font-bold text-slate-800 mt-1">{pendingCount.toString().padStart(2, '0')}</h2>
             <p className="text-xs text-slate-600 font-bold mt-1">Immediate priority</p>
           </div>
        </div>

        <div 
          className="card border-slate-100 shadow-none hover:shadow-md border-l-4 border-l-emerald-500 !py-5 relative overflow-hidden group cursor-pointer hover:bg-slate-50 transition-all"
          onClick={() => {
            setStatusFilter('Verified/Completed');
            setSearchTerm('');
            setPriorityFilter('Priority: All');
          }}
        >
           <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-emerald-500"></div>
           <div className="bg-emerald-50 text-emerald-600 p-2 rounded inline-block">
             <CheckCircle2 className="w-5 h-5" />
           </div>
           <div className="mt-4">
             <p className="text-sm font-medium text-slate-500">Total Verified Today</p>
             <h2 className="text-3xl font-bold text-slate-800 mt-1">{totalVerifiedCount}</h2>
             <p className="text-xs text-slate-400 mt-1">{verifiedPercentage}% of total received</p>
           </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="card p-0 overflow-hidden pt-4 mt-6">
        
        {/* Table Controls */}
        <div className="flex items-center justify-between px-6 pb-4">
           <div className="relative w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search Patient or RX ID..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500" 
             />
             {searchTerm && (
               <button 
                 onClick={() => setSearchTerm('')}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
             )}
           </div>
           
           <div className="flex items-center gap-3">
              <select 
                className="bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-600 outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Statuses</option>
                <option>Pending</option>
                <option>New</option>
                <option>In Review</option>
                <option>Flagged</option>
                <option>Verified</option>
                <option>Verified/Completed</option>
              </select>
              <select 
                className="bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-600 outline-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option>Priority: All</option>
                <option>High Priority</option>
                <option>Normal Priority</option>
              </select>
              <button 
                className="p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
                title="Filter View"
              >
                <Filter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                   setSearchTerm('');
                   setStatusFilter('All Statuses');
                   setPriorityFilter('Priority: All');
                }}
                className="p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
                title="Reset Filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* Table Component */}
        <div className="table-container shadow-none border-x-0 border-b-0 rounded-none">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-header">Priority</th>
                <th className="th-header">RX ID</th>
                <th className="th-header">Patient Name</th>
                <th className="th-header">Source Type</th>
                <th className="th-header">Date Received</th>
                <th className="th-header">Status</th>
                <th className="th-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((rx) => (
                <tr 
                  key={rx.id} 
                  onClick={() => navigate(`/pharmacist/verification/${rx.id}`, { state: { rxPatientName: rx.patientName, rxDob: rx.dob, flagMessage: rx.flagMessage } })}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${rx.rowStyle}`}
                >
                  <td className="td-cell">
                    {rx.isHighPriority ? (
                      <span className="text-red-600 font-bold text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>! High</span>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs flex items-center gap-1"><span className="w-3 border-t-2 border-slate-300"></span> Normal</span>
                    )}
                  </td>
                  <td className="td-cell text-slate-500">#RX-{rx.id}</td>
                  <td className="td-cell">
                    <div className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
                      {rx.patientName}
                      {(rx.patientId || rx.registerId) && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded tracking-wider">ID: {rx.patientId || rx.registerId}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">DOB: {rx.dob}</div>
                  </td>
                  <td className="td-cell text-emerald-600 flex items-center gap-2 mt-3">
                    {rx.isDigital ? <><Smartphone className="w-4 h-4" /> Digital</> : <><PenTool className="w-4 h-4" /> Handwritten</>}
                  </td>
                  <td className="td-cell text-slate-600">
                    <div className="font-medium">{rx.dateMain}</div>
                    <div className="text-xs">{rx.dateSub}</div>
                  </td>
                  <td className="td-cell"><span className={`${rx.statusStyle} font-bold text-[10px] uppercase px-2 py-1 rounded`}>{rx.status}</span></td>
                  <td className="td-cell text-right">
                    <button 
                       className="text-emerald-600 font-bold hover:underline"
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         navigate(`/pharmacist/verification/${rx.id}`, { state: { rxPatientName: rx.patientName, rxDob: rx.dob, flagMessage: rx.flagMessage } }); 
                       }}
                    >
                      {rx.actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white text-sm text-slate-500">
           <span>
             {filteredData.length === 0 ? 'No prescriptions found' : 
             `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredData.length)} of ${filteredData.length} prescriptions`}
           </span>
           <div className="flex gap-1">
             <button 
               onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
               disabled={currentPage === 1 || filteredData.length === 0}
               className="px-2 py-1 border border-slate-200 rounded text-slate-400 disabled:opacity-50 transition-opacity"
             >&lt;</button>
             
             {filteredData.length > 0 && Array.from({ length: totalPages }).map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-3 py-1 border rounded transition-colors ${currentPage === idx + 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {idx + 1}
                </button>
             ))}
             
             <button 
               onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
               disabled={currentPage === totalPages || filteredData.length === 0}
               className="px-2 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-opacity"
             >&gt;</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistPrescriptions;

