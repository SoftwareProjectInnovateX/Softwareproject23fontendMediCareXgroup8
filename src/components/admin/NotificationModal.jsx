import { useState } from 'react';
import { NotificationIcon, formatDate, getTypeLabel, DETAIL_FIELDS } from './notificationHelpers';

export const NotificationModal = ({ notification, onClose, onMarkRead, onDelete, onMarkReceived }) => {
  const [processing, setProcessing] = useState(false);

  const handleReceived = async () => {
    if (!window.confirm(
      `Mark order as RECEIVED?\n\nThis will:\n- Update order status to COMPLETED\n- Add units to your inventory\n- Update product availability`
    )) return;
    try {
      setProcessing(true);
      await onMarkReceived(notification.id);
      alert('Order marked as received!\n\nInventory has been updated.');
      onClose();
    } catch (e) {
      alert('Failed to process order: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this notification?')) return;
    await onDelete(notification.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 m-0">Notification Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            ×
          </button>
        </div>

        <div className="p-7">
          {/* Type + date */}
          <div className="flex gap-4 items-start mb-6 pb-5 border-b-2 border-slate-100">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <NotificationIcon type={notification.type} size={30} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 m-0 mb-1 uppercase tracking-wide">
                {getTypeLabel(notification.type)}
              </h3>
              <p className="text-[13px] text-slate-400 m-0">{formatDate(notification.createdAt)}</p>
            </div>
          </div>

          {/* Message */}
          <div className="bg-slate-50 border-l-4 border-blue-500 px-4 py-4 rounded-lg mb-6">
            <p className="m-0 text-[15px] text-slate-800 leading-relaxed">{notification.message}</p>
          </div>

          {/* Detail fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {DETAIL_FIELDS.filter(([key]) => notification[key]).map(([key, label, fmt]) => (
              <div key={key} className="flex flex-col">
                <label className="text-[13px] text-slate-500 font-medium mb-1.5">{label}</label>
                <p className="m-0 text-[15px] text-slate-800 font-semibold">
                  {fmt ? fmt(notification[key]) : notification[key]}
                </p>
              </div>
            ))}
          </div>

          {/* Mark as received (ORDER_APPROVED only) */}
          {notification.type === 'ORDER_APPROVED' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-center mb-6">
              <button
                onClick={handleReceived}
                disabled={processing || notification.read}
                className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all mb-2"
              >
                {processing ? 'Processing...' : notification.read ? 'Already Processed' : '✓ Mark as Received'}
              </button>
              <p className="m-0 text-[13px] text-blue-700">
                {notification.read
                  ? 'This order has been processed'
                  : 'Click to confirm product receipt and update inventory'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-5 border-t-2 border-slate-100 flex-wrap">
            {!notification.read && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg border-none cursor-pointer transition-all"
              >
                Mark as Read
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex-1 py-3 px-5 bg-slate-100 hover:bg-red-500 text-red-500 hover:text-white border-2 border-red-400 text-sm font-semibold rounded-lg cursor-pointer transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};