import React, { useState, useEffect } from 'react';
import { auth } from '../../../services/firebase';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Sparkles, Lightbulb, Target, TrendingUp } from 'lucide-react';

const LoyaltyDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [campaignIdeas, setCampaignIdeas] = useState([]);
  const [personalizedOffers, setPersonalizedOffers] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const getToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  };

  useEffect(() => {
    fetchAnalytics();
    fetchTopCustomers();
    fetchCampaignIdeas();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/loyalty/analytics', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchTopCustomers = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/loyalty/top-customers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCampaignIdeas = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/loyalty/campaign-ideas', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setCampaignIdeas(data.ideas || []);
    } catch (error) {
      console.error('Error fetching campaign ideas:', error);
    }
  };

  const generatePersonalizedOffers = async (customerUid) => {
    setLoadingAI(true);
    try {
      const token = await getToken();
      const response = await fetch(`/api/loyalty/customer/${customerUid}/offers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setPersonalizedOffers(data.offers || []);
    } catch (error) {
      console.error('Error generating personalized offers:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const token = await getToken();
      const response = await fetch(`/api/loyalty/customer/${searchTerm}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const customer = await response.json();
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

  const chartData = [
    { name: 'Silver', value: analytics.levelDistribution?.Silver || 0, color: '#6B7280' },
    { name: 'Gold', value: analytics.levelDistribution?.Gold || 0, color: '#F59E0B' },
    { name: 'Platinum', value: analytics.levelDistribution?.Platinum || 0, color: '#8B5CF6' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Loyalty Program Dashboard</h1>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: analytics.totalCustomers || 0 },
          { label: 'Total Revenue', value: `$${analytics.totalRevenue?.toFixed(2) || '0.00'}` },
          { label: 'Total Points Issued', value: analytics.totalPoints || 0 },
          { label: 'Avg Order Value', value: `$${analytics.averageOrderValue?.toFixed(2) || '0.00'}` },
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
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
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
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
        {selectedCustomer && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{selectedCustomer.name}</h3>
              <button
                onClick={() => generatePersonalizedOffers(selectedCustomer.uid)}
                disabled={loadingAI}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {loadingAI ? 'Generating...' : 'AI Offers'}
              </button>
            </div>
            <p>Email: {selectedCustomer.email}</p>
            <p>Level: <span className={`px-2 py-0.5 rounded text-sm font-medium ${levelColors[selectedCustomer.level]}`}>{selectedCustomer.level}</span></p>
            <p>Total Spent: ${selectedCustomer.totalSpent?.toFixed(2)}</p>
            <p>Points: {selectedCustomer.totalPoints}</p>
            <p>Purchase Count: {selectedCustomer.purchaseCount}</p>
            <p>Churn Risk: {selectedCustomer.predictedChurnRisk}%</p>
            <div className="mt-2">
              <strong>Recommended Offers:</strong>
              <ul className="list-disc list-inside">
                {selectedCustomer.recommendedOffers?.map((offer, index) => (
                  <li key={index}>{offer}</li>
                ))}
              </ul>
            </div>
            {personalizedOffers.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI-Generated Personalized Offers
                </h4>
                <ul className="list-disc list-inside mt-2 text-purple-700">
                  {personalizedOffers.map((offer, index) => (
                    <li key={index}>{offer}</li>
                  ))}
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
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColors[customer.level]}`}>
                      {customer.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">${customer.totalSpent?.toFixed(2)}</td>
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
            <p>AI campaign ideas will appear here</p>
            <p className="text-sm">Configure OpenAI API key for enhanced features</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyDashboard;