import { formatDate, getStatusStyle } from './orderHelpers';

const DETAIL_FIELDS = (order) => [
  { label: 'Product',      value: order.productName || order.product },
  { label: 'Product Code', value: order.productCode, mono: true },
  { label: 'Category',     value: order.category },
  { label: 'Supplier',     value: order.supplierName },
  { label: 'Quantity',     value: `${order.quantity} units` },
  { label: 'Unit Price',   value: `Rs. ${Number(order.unitPrice).toFixed(2)}` },
  {
    label: 'Total Amount',
    value: `Rs. ${Number(order.totalAmount ?? order.quantity * order.unitPrice).toFixed(2)}`,
    highlight: 'text-emerald-600 text-lg font-bold',
  },
  { label: 'Order Date', value: formatDate(order.orderDate || order.createdAt) },
  ...(order.approvalDate   ? [{ label: 'Approval Date',   value: formatDate(order.approvalDate) }]   : []),
  ...(order.completionDate ? [{ label: 'Completion Date', value: formatDate(order.completionDate) }] : []),
];

export const OrderModal = ({ order, onClose, onMarkReceived }) => (
  <div
    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
    style={{ animation: 'fadeIn 0.2s ease-out' }}
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl"
      style={{ animation: 'slideUp 0.3s ease-out' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 m-0">Order Details</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
        >
          ×
        </button>
      </div>

      <div className="p-7">
        {/* PO ID + Status */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
          <h3 className="text-xl font-semibold text-blue-600 font-mono m-0">
            {order.poId || order.productId}
          </h3>
          <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(order.status)}`}>
            {order.status}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-5 mb-6">
          {DETAIL_FIELDS(order).map((item) => (
            <div key={item.label} className="flex flex-col">
              <label className="text-[13px] text-slate-500 font-medium mb-1.5">{item.label}</label>
              <p className={`m-0 text-[15px] text-slate-800 font-medium ${item.highlight || ''} ${item.mono ? 'font-mono text-sm' : ''}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-slate-50 px-4 py-4 rounded-lg mb-5">
            <label className="block text-[13px] text-slate-500 font-semibold mb-2">Notes</label>
            <p className="m-0 text-sm text-slate-800 leading-relaxed">{order.notes}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {order.rejectionReason && (
          <div className="bg-red-50 border-l-4 border-red-500 px-4 py-4 rounded-lg mb-5">
            <label className="block text-[13px] text-red-700 font-semibold mb-2">Rejection Reason</label>
            <p className="m-0 text-sm text-red-900 leading-relaxed">{order.rejectionReason}</p>
          </div>
        )}

        {/* Mark as Received */}
        {order.status === 'DELIVERED' && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 text-center">
            <p className="text-sm text-orange-700 font-semibold mb-3 m-0">
              🚚 Supplier has marked this order as Delivered
            </p>
            <button
              onClick={() => onMarkReceived(order.id, order)}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg mb-2"
            >
              ✓ Confirm Receipt &amp; Mark as Completed
            </button>
            <p className="m-0 text-[13px] text-orange-700">
              Confirming receipt will update inventory and unlock the final 50% payment.
            </p>
          </div>
        )}

        {/* Already Completed */}
        {order.status === 'COMPLETED' && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
            <p className="text-sm text-emerald-700 font-semibold m-0">
              Order completed. Inventory updated and final payment unlocked.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);