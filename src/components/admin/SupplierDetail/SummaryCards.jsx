export const SummaryCards = ({ orders }) => {
  const cards = [
    { label: "Total Orders",  value: orders.length,                                         color: "text-slate-800" },
    { label: "Pending",       value: orders.filter((o) => o.status === "PENDING").length,   color: "text-amber-500" },
    { label: "Approved",      value: orders.filter((o) => o.status === "APPROVED").length,  color: "text-emerald-500" },
    { label: "Rejected",      value: orders.filter((o) => o.status === "REJECTED").length,  color: "text-red-500" },
    { label: "Completed",     value: orders.filter((o) => o.status === "COMPLETED").length, color: "text-cyan-500" },
    {
      label: "Total Value",
      value: `Rs. ${orders.reduce((s, o) => s + (Number(o.amount || o.totalAmount) || 0), 0).toFixed(2)}`,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm text-center">
          <h4 className="text-xs text-slate-500 uppercase font-semibold mb-2">{card.label}</h4>
          <p className={`text-3xl font-bold m-0 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};