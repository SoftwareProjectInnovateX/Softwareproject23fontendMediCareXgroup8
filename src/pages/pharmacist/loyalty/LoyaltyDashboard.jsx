import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Sparkles, Lightbulb, Target } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api`;

const LoyaltyDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [campaignIdeas, setCampaignIdeas] = useState([]);
  const [personalizedOffers, setPersonalizedOffers] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  // Always get a fresh token
  const getToken = async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (!user) { resolve(null); return; }
        try {
          const token = await user.getIdToken(true); // force refresh
          resolve(token);
        } catch {
          resolve(null);
        }
      });
    });
  };

  const apiFetch = async (path) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || 'empty response'}`);
    }
    return res.json();
  };

  useEffect(() => {
    if (fetchedRef.current) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      try {
        setLoading(true);
        const [analyticsData, customersData, campaignData] = await Promise.allSettled([
          apiFetch('/api/loyalty/analytics'),
          apiFetch('/api/loyalty/top-customers'),
          apiFetch('/api/loyalty/campaign-ideas'),
        ]);

        if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
        else console.error('Analytics failed:', analyticsData.reason);

        if (customersData.status === 'fulfilled') setCustomers(Array.isArray(customersData.value) ? customersData.value : []);
        else console.error('Customers failed:', customersData.reason);

        if (campaignData.status === 'fulfilled') setCampaignIdeas(campaignData.value?.ideas || []);
        else console.error('Campaign ideas failed:', campaignData.reason);

      } catch (err) {
        setError(err.message);
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const generatePersonalizedOffers = async (customerUid) => {
    setLoadingAI(true);
    try {
      const data = await apiFetch(`/api/loyalty/customer/${customerUid}/offers`);
      setPersonalizedOffers(data.offers || []);
    } catch (error) {
      console.error('Error generating offers:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const customer = await apiFetch(`/api/loyalty/customer/${searchTerm}`);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error('Error searching customer:', error);
    }
  };

  const levelColors = {
    Silver: 'bg-gray-400 text-white',
    Gold: 'bg-yellow-500 text-white',
    Platinum: 'bg-purple-500 text-white',
  };

  const levelDistribution = analytics.levelDistribution || { Silver: 0, Gold: 0, Platinum: 0 };
  const chartData = [
    { name: 'Silver', value: Number(levelDistribution.Silver || 0), color: '#6B7280' },
    { name: 'Gold', value: Number(levelDistribution.Gold || 0), color: '#F59E0B' },
    { name: 'Platinum', value: Number(levelDistribution.Platinum || 0), color: '#8B5CF6' },
  ];
  const totalMembers = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500 text-lg">Loading Loyalty Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <strong>Error loading dashboard:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-black text-slate-800">Loyalty Program Dashboard</h1>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: analytics.totalCustomers || 0 },
          { label: 'Total Revenue', value: `$${(analytics.totalRevenue || 0).toFixed(2)}` },
          { label: 'Total Points Issued', value: analytics.totalPoints || 0 },
          { label: 'Avg Order Value', value: `$${(analytics.averageOrderValue || 0).toFixed(2)}` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-4 border">
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border">
          <h2 className="text-lg font-semibold mb-4">Membership Level Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, 'Members']} />
              <Legend verticalAlign="bottom" align="center" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <h2 className="text-lg font-semibold mb-4">Top Customers by Spending</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customers.slice(0, 5)}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalSpent" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Search */}
      <div className="bg-white rounded-lg shadow p-4 border">
        <h2 className="text-lg font-semibold mb-4">Customer Search</h2>
        <div className="flex space-x-2">
          <input
            className="border rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by UID, email, or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Search
          </button>
        </div>
        {selectedCustomer && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{selectedCustomer.name || 'Unknown'}</h3>
              <button onClick={() => generatePersonalizedOffers(selectedCustomer.uid)}
                disabled={loadingAI}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {loadingAI ? 'Generating...' : 'AI Offers'}
              </button>
            </div>
            <p>Email: {selectedCustomer.email}</p>
            <p>Level: <span className={`px-2 py-0.5 rounded text-sm font-medium ${levelColors[selectedCustomer.level] || ''}`}>{selectedCustomer.level}</span></p>
            <p>Total Spent: ${(selectedCustomer.totalSpent || 0).toFixed(2)}</p>
            <p>Points: {selectedCustomer.totalPoints}</p>
            <p>Purchase Count: {selectedCustomer.purchaseCount}</p>
            <p>Churn Risk: {selectedCustomer.predictedChurnRisk}%</p>
            {personalizedOffers.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> AI-Generated Personalized Offers
                </h4>
                <ul className="list-disc list-inside mt-2 text-purple-700">
                  {personalizedOffers.map((offer, index) => <li key={index}>{offer}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Customers Table */}
      <div className="bg-white rounded-lg shadow p-4 border">
        <h2 className="text-lg font-semibold mb-4">Top Loyal Customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Total Spent</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Purchase Count</th>
                <th className="px-4 py-3">Churn Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">No customers found</td></tr>
              ) : customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{customer.name || '—'}</td>
                  <td className="px-4 py-3">{customer.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColors[customer.level] || ''}`}>
                      {customer.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">${(customer.totalSpent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{customer.totalPoints}</td>
                  <td className="px-4 py-3">{customer.purchaseCount}</td>
                  <td className="px-4 py-3">{customer.predictedChurnRisk}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Campaign Ideas */}
      <div className="bg-white rounded-lg shadow p-4 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI-Generated Campaign Ideas
        </h2>
        {campaignIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaignIdeas.map((idea, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{idea}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No campaign ideas available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyDashboard;