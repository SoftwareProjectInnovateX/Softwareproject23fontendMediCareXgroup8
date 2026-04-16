/**
 * SearchResultCard
 * Renders one search result as a table-style row card,
 * matching the existing Products.jsx table aesthetic.
 */
export default function SearchResultCard({ product, onOrderClick, pendingOrder }) {
  const getScoreBadge = (score) => {
    if (score >= 90) return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (score >= 70) return "bg-blue-100 text-blue-700 border border-blue-200";
    if (score >= 50) return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-slate-100 text-slate-600 border border-slate-200";
  };

  const getStockStyle = (stock) =>
    stock <= 100 ? "text-red-600 font-semibold" : "text-slate-800 font-semibold";

  const getOrderStatusBadge = () => {
    if (!pendingOrder) return null;
    const styles = {
      PENDING:  "bg-amber-100 text-amber-800 border border-amber-400",
      ACCEPTED: "bg-emerald-100 text-emerald-800 border border-emerald-500",
      REJECTED: "bg-red-100 text-red-800 border border-red-400",
    };
    const style = styles[pendingOrder.status] || "bg-gray-100 text-gray-600";
    const label =
      pendingOrder.status.charAt(0) + pendingOrder.status.slice(1).toLowerCase();
    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${style}`}>
          {label}
        </span>
        <span className="text-[11px] text-slate-400">Qty: {pendingOrder.quantity}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all duration-150 px-4 py-3.5 flex items-center gap-4 min-w-0">

      {/* Product Code */}
      <div className="w-24 flex-shrink-0">
        <span className="text-sm font-mono text-slate-600">{product.productCode || "—"}</span>
      </div>

      {/* Product Name + Manufacturer */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {product.productName}
          </p>
          {/* AI Match badge — only for vector results */}
          {product.searchSource === "vector" && (
            <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] rounded font-semibold">
              AI Match
            </span>
          )}
        </div>
        {product.manufacturer && (
          <p className="text-xs text-slate-400 mt-0.5">{product.manufacturer}</p>
        )}
      </div>

      {/* Category */}
      <div className="w-28 flex-shrink-0 hidden md:block">
        <span className="text-sm text-slate-700">{product.category}</span>
      </div>

      {/* Supplier */}
      <div className="w-32 flex-shrink-0 hidden lg:block">
        <span className="inline-block bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-medium">
          {product.supplierName || "—"}
        </span>
      </div>

      {/* Stock */}
      <div className="w-20 flex-shrink-0 text-center">
        <span className={`text-sm ${getStockStyle(product.stock)}`}>
          {product.stock ?? "—"}
        </span>
        {product.stock <= 100 && (
          <span className="ml-1.5 inline-block bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            LOW
          </span>
        )}
      </div>

      {/* Prices */}
      <div className="w-24 flex-shrink-0 hidden xl:block text-sm text-slate-700">
        Rs. {product.wholesalePrice ? Number(product.wholesalePrice).toFixed(2) : "0.00"}
      </div>
      <div className="w-24 flex-shrink-0 hidden xl:block text-sm text-slate-700">
        Rs. {product.retailPrice ? Number(product.retailPrice).toFixed(2) : "0.00"}
      </div>

      {/* Similarity Score */}
      <div className="w-24 flex-shrink-0 text-center">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getScoreBadge(product.similarityScore)}`}>
          {product.similarityScore}% match
        </span>
      </div>

      {/* Order Status */}
      <div className="w-28 flex-shrink-0 text-center">
        {getOrderStatusBadge() || (
          <span className="text-slate-300 italic text-sm">—</span>
        )}
      </div>

      {/* Action */}
      <div className="w-28 flex-shrink-0 text-right">
        {product.stock <= 100 && (
          <button
            onClick={() => onOrderClick(product)}
            disabled={pendingOrder?.status === "PENDING"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:translate-y-0 disabled:shadow-none"
          >
            {pendingOrder?.status === "PENDING" ? "Order Sent" : "Order Now"}
          </button>
        )}
      </div>
    </div>
  );
}