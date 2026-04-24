import { useState } from 'react';
import Card from '../../components/Card';
import { useNotifications } from '../../components/admin/useNotifications';
import { FilterBar } from '../../components/admin/FilterBar';
import { NotificationCard } from '../../components/admin/NotificationCard';
import { NotificationModal } from '../../components/admin/NotificationModal';



const EmptyState = ({ message, sub }) => (
  <div className="bg-white rounded-xl shadow-sm py-20 text-center text-slate-500">
    <p className="text-lg mb-2">{message}</p>
    {sub && <small className="text-sm text-slate-400">{sub}</small>}
  </div>
);

const Notifications = () => {
  const { notifications, loading, markAsRead, markAllAsRead, deleteById, markReceived } = useNotifications();
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = filter === 'All' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const statCards = [
    { title: 'Total Notifications', value: notifications.length },
    { title: 'Unread',              value: unreadCount },
    { title: 'Orders Approved',     value: notifications.filter((n) => n.type === 'ORDER_APPROVED').length },
    { title: 'Low Stock Alerts',    value: notifications.filter((n) => n.type === 'LOW_STOCK_ALERT').length },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Notifications</h1>
          <p className="text-slate-500 text-[15px]">Stay updated with supplier responses and stock alerts</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg border-none cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {statCards.map((card) => <Card key={card.title} {...card} />)}
      </div>

      {/* Filters */}
      <FilterBar filter={filter} onFilter={setFilter} />

      {/* List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <EmptyState message="Loading notifications..." />
        ) : !filtered.length ? (
          <EmptyState message="No notifications found" sub="You'll see updates from suppliers here" />
        ) : (
          filtered.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onClick={setSelected}
              onMarkRead={markAsRead}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {selected && (
        <NotificationModal
          notification={selected}
          onClose={() => setSelected(null)}
          onMarkRead={markAsRead}
          onDelete={deleteById}
          onMarkReceived={markReceived}
        />
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }              to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default Notifications;