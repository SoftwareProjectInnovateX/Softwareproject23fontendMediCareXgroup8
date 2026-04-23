import { getOrderStatusStyle, formatResponseDate } from "../supplierHelpers";

const TABLE_HEADERS = ["PO ID", "Product", "Product Code", "Category", "Quantity", "Unit Price", "Total Amount", "Status", "Order Date", "Response Date"];

export const OrdersTable = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center shadow-sm mb-8">
        <p className="text-lg text-slate-500 mb-1">No orders placed for this supplier yet</p>
        <small className="text-slate-400">Orders placed by admin will appear here</small>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead className="bg-indigo-500">
            <tr>
              {TABLE_HEADERS.map((h) => (
                <th key={h} className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 font-mono font-semibold text-indigo-600 text-sm">{order.poId}</td>
                <td className="px-4 py-4 font-semibold text-slate-800 text-sm">{order.product || order.productName || "N/A"}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{order.productCode || "N/A"}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{order.category || "N/A"}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-800">{order.quantity || 0} units</td>
                <td className="px-4 py-4 text-sm font-semibold text-emerald-600">Rs. {Number(order.unitPrice || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-emerald-600">Rs. {Number(order.amount || order.totalAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getOrderStatusStyle(order.status)}`}>
                    {order.status || "PENDING"}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{order.date}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{formatResponseDate(order)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};