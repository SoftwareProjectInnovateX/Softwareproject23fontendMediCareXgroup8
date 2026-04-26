const OrderFilters = ({ filterStatus, setFilterStatus, orders }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex justify-between items-center flex-wrap gap-4">
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm cursor-pointer bg-white min-w-[200px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
      >
        <option>All Orders</option>
        <option>PENDING</option>
        <option>APPROVED</option>
        <option>REJECTED</option>
        <option>COMPLETED</option>
      </select>

      <div className="flex gap-6 text-sm text-slate-500 flex-wrap">
        {[
          { label: "Total",    value: orders.length },
          { label: "Pending",  value: orders.filter((o) => o.status === "PENDING").length },
          { label: "Approved", value: orders.filter((o) => o.status === "APPROVED").length },
        ].map((s) => (
          <span key={s.label}>
            {s.label}: <strong className="text-slate-800 font-semibold">{s.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
};

export default OrderFilters;