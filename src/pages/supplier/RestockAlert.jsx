import "./RestockAlert.css";
import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

export default function RestockAlert() {
  const { user } = useAuth(); // 🔐 Firebase Auth
  const supplierId = user?.uid;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ALERTS ================= */
  const fetchAlerts = useCallback(async () => {
    if (!supplierId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const q = query(
        collection(db, "notifications"),
        where("supplierId", "==", supplierId),
        where("type", "==", "LOW_STOCK"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setAlerts(list);
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  /* ================= RUN ON LOAD ================= */
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ================= UI ================= */
  return (
    <div className="alert-page">
      <h2>Low Stock Alerts</h2>

      {loading && (
        <p className="alert-empty">Loading alerts...</p>
      )}

      {!loading && alerts.length === 0 && (
        <p className="alert-empty">No low stock alerts</p>
      )}

      {!loading && alerts.length > 0 && (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-card">
              <p className="alert-message">
                {alert.message}
              </p>

              <small className="alert-time">
                {alert.createdAt?.toDate
                  ? alert.createdAt.toDate().toLocaleString()
                  : ""}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
