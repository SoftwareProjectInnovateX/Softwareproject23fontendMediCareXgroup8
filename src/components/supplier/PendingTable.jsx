import CategoryBadge from './CategoryBadge';

const STATUS_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700',    label: 'Pending Approval' },
  approved: { cls: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
  rejected: { cls: 'bg-red-100 text-red-700',         label: 'Rejected' },
};

const PendingTable = ({ loading, filteredPending, formatDate }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-lg">Loading...</div>
      ) : filteredPending.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-slate-500">No pending submissions</p>
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div className="m-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <p className="text-[13px] text-amber-800">
              Products listed here are awaiting admin review. Once approved, they will appear in the{' '}
              <strong>Active Products</strong> tab and be visible in the admin inventory.
              This list updates in real-time — no need to refresh.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  {['Product Name', 'Category', 'Wholesale Price', 'Stock', 'Expiry Date', 'Submitted', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((product) => {
                  const badge = STATUS_BADGE[product.status] || STATUS_BADGE.pending;

                  return (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900 text-sm mb-0.5">{product.productName}</p>
                        {product.manufacturer && (
                          <p className="text-xs text-slate-400">{product.manufacturer}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <CategoryBadge value={product.category} />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        Rs.{Number(product.wholesalePrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{product.stock} units</td>
                      <td className="px-4 py-4 text-xs text-slate-700">
                        {formatDate(product.expireDate)}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400">
                        {formatDate(product.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {product.status === 'rejected' && product.rejectionReason && (
                            <p className="text-[11px] text-red-500 mt-1">{product.rejectionReason}</p>
                          )}
                          {product.status === 'approved' && product.productCode && (
                            <p className="text-[11px] text-emerald-600 mt-1 font-mono">{product.productCode}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PendingTable;