export const getOrderStatusStyle = (status) => {
  switch ((status || "").toLowerCase()) {
    case "pending":   return "bg-amber-100 text-amber-800";
    case "approved":  return "bg-emerald-100 text-emerald-800";
    case "rejected":  return "bg-red-100 text-red-800";
    case "completed": return "bg-cyan-100 text-cyan-800";
    default:          return "bg-gray-100 text-gray-600";
  }
};

export const formatResponseDate = (order) => {
  if (order.approvalDate?.toDate)   return order.approvalDate.toDate().toLocaleDateString();
  if (order.approvedAt?.toDate)     return order.approvedAt.toDate().toLocaleDateString();
  if (order.rejectionDate?.toDate)  return order.rejectionDate.toDate().toLocaleDateString();
  if (order.rejectedAt?.toDate)     return order.rejectedAt.toDate().toLocaleDateString();
  return "-";
};