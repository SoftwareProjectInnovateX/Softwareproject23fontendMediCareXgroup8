export const RejectedOrders = ({ orders }) => {
  const rejected = orders.filter((o) => o.status === "REJECTED");
  if (rejected.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold text-red-500 mb-4">Rejected Orders</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rejected.map((order) => (
          <div key={order.id} className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono font-semibold text-indigo-600 text-sm">{order.poId}</span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase bg-red-100 text-red-800">
                REJECTED
              </span>
            </div>
            <p className="text-sm text-slate-700 mb-1"><strong>Product:</strong> {order.product || order.productName}</p>
            <p className="text-sm text-slate-700 mb-1"><strong>Quantity:</strong> {order.quantity} units</p>
            <p className="text-sm text-slate-700 mb-1">
              <strong>Rejection Date:</strong>{" "}
              {order.rejectionDate?.toDate ? order.rejectionDate.toDate().toLocaleDateString() : "N/A"}
            </p>
            {order.rejectionReason && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs font-semibold text-red-600 mb-1">Reason:</p>
                <p className="text-sm text-red-900 italic">{order.rejectionReason}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};