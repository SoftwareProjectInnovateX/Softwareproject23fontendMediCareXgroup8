import { CheckCircle, Clock, XCircle, AlertCircle, Truck } from 'lucide-react';

export const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'delivered':      return { bg: '#f0fdf4',               color: '#16a34a', border: '#bbf7d0' };
    case 'approved':       return { bg: 'rgba(26,135,225,0.08)', color: '#1a87e1', border: 'rgba(26,135,225,0.25)' };
    case 'paid':           return { bg: '#f0fdf4',               color: '#16a34a', border: '#bbf7d0' };
    case 'ready to collect': return { bg: '#ecfdf5',               color: '#059669', border: '#a7f3d0' };
    case 'out for delivery': return { bg: '#eff6ff',               color: '#2563eb', border: '#bfdbfe' };
    case 'processing':     return { bg: '#f5f3ff',               color: '#7c3aed', border: '#ddd6fe' };
    case 'cancelled':      return { bg: '#fef2f2',               color: '#dc2626', border: '#fecaca' };
    default:               return { bg: '#fffbeb',               color: '#d97706', border: '#fde68a' };
  }
};

// alias used by PrescriptionPage
export const getStatusColor = statusColor;

export const returnStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'rejected': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    default:         return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  }
};

export const refundStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'processed': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'rejected':  return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    default:          return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  }
};

export function StatusIcon({ status }) {
  switch ((status || '').toLowerCase()) {
    case 'delivered':
    case 'approved':   
    case 'paid':
    case 'ready to collect': return <CheckCircle size={12} />;
    case 'out for delivery': return <Truck size={12} />;
    case 'processing': return <Clock size={12} />;
    case 'cancelled':  return <XCircle size={12} />;
    default:           return <AlertCircle size={12} />;
  }
}

// reusable badge used by PrescriptionPage and OrderCard
export function StatusBadge({ status, colors }) {
  const sc = colors || statusColor(status);
  return (
    <span
      className="flex items-center gap-[5px] text-[11px] font-bold px-[13px] py-[5px] rounded-[20px] uppercase tracking-[0.06em]"
      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
    >
      <StatusIcon status={status} />
      {status || 'Pending'}
    </span>
  );
}