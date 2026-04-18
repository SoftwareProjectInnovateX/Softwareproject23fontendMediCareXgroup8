import { useState, useEffect } from "react";
import API_BASE_URL from "../../config/api";

export default function SearchAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { auth } = await import('../../services/firebase');
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const response = await fetch(`${API_BASE_URL}/search/analytics`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Could not load analytics. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#f5f9ff] min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f5f9ff] min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const maxCount = analytics?.topSearches?.[0]?.count || 1;

  return (
    <div className="p-8 bg-[#f5f9ff] min-h-screen">

      {/* Page Header — matches Products.jsx header style */}
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Search Analytics</h1>
      <p className="text-slate-500 text-[15px] font-medium mb-7">
        Admin Dashboard - Search Insights
      </p>

      {/* Refresh Button */}
      <div className="flex justify-end mb-5">
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Total Searches
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {analytics?.totalSearches?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Unique Search Terms
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {analytics?.topSearches?.length || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Top terms tracked</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Inventory Gaps
          </p>
          <p className="text-3xl font-bold text-orange-500">
            {analytics?.zeroResults?.length || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Terms with no results</p>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Searches Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Top Searched Terms
          </h2>

          {analytics?.topSearches?.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              No search data yet. Start searching to see analytics.
            </p>
          ) : (
            <div className="space-y-4">
              {analytics?.topSearches?.map((item, index) => (
                <div key={item.query}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 w-4">
                        {index + 1}
                      </span>
                      <span className="text-sm text-slate-700 capitalize font-medium">
                        {item.query}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-[#e6efff] px-2 py-0.5 rounded-full">
                      {item.count}x
                    </span>
                  </div>
                  <div className="ml-6 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Inventory Gaps */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Inventory Gaps
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Searches that returned zero results — consider adding these products
            </p>

            {analytics?.zeroResults?.length === 0 ? (
              <p className="text-emerald-600 text-sm flex items-center gap-1.5 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 13l4 4L19 7" />
                </svg>
                No gaps found — great inventory coverage!
              </p>
            ) : (
              <div className="space-y-1">
                {analytics?.zeroResults?.map((item) => (
                  <div
                    key={item.query}
                    className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-sm text-slate-700 capitalize font-medium">
                      {item.query}
                    </span>
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-semibold">
                      {item.count} searches
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last 7 Days Activity */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Last 7 Days Activity
            </h2>

            {analytics?.last7Days?.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {analytics?.last7Days?.map((day) => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 w-16 flex-shrink-0">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-2 flex-1 ml-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((day.count / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-6 text-right font-medium">
                        {day.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}