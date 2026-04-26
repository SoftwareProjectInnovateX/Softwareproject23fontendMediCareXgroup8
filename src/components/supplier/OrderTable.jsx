const getStatusStyle = (status) => {
  switch (status) {
    case "PENDING":   return "bg-amber-100 text-amber-800";
    case "APPROVED":  return "bg-blue-100 text-blue-800";
    case "REJECTED":  return "bg-red-100 text-red-800";
    case "COMPLETED": return "bg-emerald-100 text-emerald-800";
    default:          return "bg-amber-100 text-amber-800";
  }
};

const getInitialPaymentBadge = (order) => {
  if (order.status !== "APPROVED" && order.status !== "COMPLETED") return null;
  const paid = order.initialPaymentStatus === "PAID";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold
      ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      Initial: {paid ? "Paid" : "Awaiting Payment"}
    </span>
  );
};

const OrderTable = ({ loading, orders, onView, onApprove, onReject, formatDate }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-lg">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-slate-500 mb-2">No orders found</p>
          <small className="text-sm text-slate-400">Orders from MediCareX will appear here</small>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                {["PO ID", "Product", "Qty", "Unit Price", "Total Amount", "Order Date", "Status", "Payment", "Action"].map((h) => (
                  <th key={h} className="px-4 py-4 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-4 py-4 font-mono font-semibold text-blue-600 text-sm">{o.poId}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800 text-sm m-0">{o.product || o.productName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 m-0">{o.productCode}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{o.quantity} units</td>
                  <td className="px-4 py-4 text-sm text-slate-700">Rs. {Number(o.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                    Rs. {Number(o.amount || o.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(o.orderDate || o.createdAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">{getInitialPaymentBadge(o)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => onView(o)}
                        className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px"
                      >
                        View
                      </button>
                      {o.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => onApprove(o.id, o)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => onReject(o)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderTable;