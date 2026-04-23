import { NotificationIcon, formatDate, getTypeLabel, getCardAccent } from './notificationHelpers';

export const NotificationCard = ({ notification, onClick, onMarkRead }) => {
  const unread = !notification.read;
  return (
    <div
      onClick={() => onClick(notification)}
      className={`relative bg-white px-6 py-5 rounded-xl shadow-sm border-l-4 ${getCardAccent(notification.type, unread)}
        flex gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${unread ? 'bg-slate-50' : ''}`}
    >
      <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-slate-100">
        <NotificationIcon type={notification.type} size={22} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
          <span className="text-[13px] font-semibold text-blue-600 uppercase tracking-wide">
            {getTypeLabel(notification.type)}
          </span>
          <span className="text-[13px] text-slate-400">{formatDate(notification.createdAt)}</span>
        </div>
        <p className="text-[15px] text-slate-800 mb-1.5 leading-relaxed m-0">{notification.message}</p>
        {notification.supplierName && (
          <p className="text-[13px] text-slate-500 mt-1 m-0">Supplier: {notification.supplierName}</p>
        )}
        {notification.productName && (
          <p className="text-[13px] text-slate-500 mt-1 m-0">
            Product: {notification.productName}
            {notification.quantity && ` • Qty: ${notification.quantity}`}
          </p>
        )}
      </div>

      {unread && (
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            className="text-[12px] text-blue-600 font-medium hover:underline bg-transparent border-none cursor-pointer"
          >
            Mark as read
          </button>
        </div>
      )}
    </div>
  );
};