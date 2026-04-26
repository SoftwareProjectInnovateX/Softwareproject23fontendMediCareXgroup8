import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowLeft, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const PharmacistNewPatients = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          // No orderBy — avoids composite index requirement; sort client-side
          query(collection(db, 'users'), where('role', '==', 'customer'))
        );
        const data = snap.docs.map(d => {
          const d2 = d.data();
          return {
            id: d2.customerId || d.id,
            firebaseUid: d.id,
            name: d2.fullName || d2.name || 'Unknown',
            email: d2.email || '',
            phone: d2.phone || 'N/A',
            dob: d2.dob || '—',
            age: d2.age || '—',
            address: d2.address || '—',
            status: d2.status || 'active',
            createdAt: d2.createdAt?.toDate?.() || null,
            timestamp: d2.createdAt?.toMillis?.() || 0,
          };
        })
        // Newest first — client-side sort
        .sort((a, b) => b.timestamp - a.timestamp);

        setCustomers(data);
      } catch (e) {
        console.error('Failed to load customers from Firebase:', e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() =>
    customers.filter(c =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm)
    ), [searchTerm, customers]);

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
            Registered Customers
          </h1>
          <p className="text-slate-500 mt-1">
            {isLoading ? 'Loading…' : `Showing ${filtered.length} of ${customers.length} registered app customers`}
          </p>
        </div>
      </div>

      <div className="card shadow-sm p-0 overflow-hidden bg-white border border-slate-200 rounded-xl">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, email or phone…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading customers from Firebase…</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Registered</th>
                  <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 border-b text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? filtered.map(c => (
                  <tr key={c.firebaseUid} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700">{c.phone}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {c.createdAt ? c.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate('/pharmacist/patients', { state: { searchTarget: c.firebaseUid } })}
                        className="text-blue-600 font-bold text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View Profile →
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <p className="text-slate-400 text-sm font-medium">
                        {customers.length === 0 ? 'No customers have registered yet.' : 'No customers match your search.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacistNewPatients;