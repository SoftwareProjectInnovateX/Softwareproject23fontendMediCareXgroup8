import CategoryBadge from './CategoryBadge';

const ProductTable = ({ loading, filteredProducts, onAddClick, onEdit, onDelete, formatDate }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-lg">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center gap-5">
          <p className="text-lg text-slate-500">No approved products yet</p>
          <button
            onClick={onAddClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
          >
            Submit Your First Product
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                {['Product Name', 'Category', 'Wholesale Price', 'Stock Supplied', 'Expiry Date', 'Availability', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900 text-sm mb-0.5">{product.productName}</p>
                    <p className="text-xs text-slate-400 font-mono">{product.productCode}</p>
                  </td>
                  <td className="px-4 py-4">
                    <CategoryBadge value={product.category} />
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                    Rs.{Number(product.wholesalePrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{product.stock} units</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatDate(product.expireDate)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      product.availability === 'in stock'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {product.availability}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(product.id, product.productName)}
                        className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                      >
                        Delete
                      </button>
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

export default ProductTable;