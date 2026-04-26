import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, options);
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      setNotifications(await apiFetch('/api/notifications?recipientType=admin'));
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const markAsRead    = (id) => apiFetch(`/api/notifications/${id}/read`,           { method: 'PATCH'  }).then(refresh);
  const markAllAsRead = ()   => apiFetch('/api/notifications/read-all',             { method: 'PATCH'  }).then(refresh);
  const deleteById    = (id) => apiFetch(`/api/notifications/${id}`,                { method: 'DELETE' }).then(refresh);
  const markReceived  = (id) => apiFetch(`/api/notifications/${id}/mark-received`,  { method: 'PATCH'  }).then(refresh);

  return { notifications, loading, markAsRead, markAllAsRead, deleteById, markReceived };
};