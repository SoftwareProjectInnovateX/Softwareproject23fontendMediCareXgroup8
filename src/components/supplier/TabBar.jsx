const TabBar = ({ activeTab, setActiveTab, productsCount, pendingCount }) => {
  return (
    <div className="flex gap-2 mb-5">
      <button
        onClick={() => setActiveTab('approved')}
        className={`px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200 border-2 ${
          activeTab === 'approved'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
        }`}
      >
        Active Products ({productsCount})
      </button>
      <button
        onClick={() => setActiveTab('pending')}
        className={`px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200 border-2 relative ${
          activeTab === 'pending'
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
        }`}
      >
        Pending Approval
        {pendingCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default TabBar;