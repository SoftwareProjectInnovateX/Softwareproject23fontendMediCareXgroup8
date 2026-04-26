import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { SupplierCard } from "../../components/admin/SupplierCard";
import { SupplierDetail } from "../../components/admin/SupplierDetail";

/**
 * Suppliers page — allows admins to browse, search, and manage all registered
 * suppliers on the platform.
 *
 * The page operates in two distinct views:
 *   - List view: displays a searchable grid of SupplierCard components.
 *   - Detail view: renders SupplierDetail for the selected supplier, showing
 *     their purchase order history and allowing the admin to set a rating.
 *
 * Data flow:
 *   - All suppliers are fetched from the `suppliers` collection on mount.
 *   - When a supplier is selected, their purchase orders are fetched from
 *     `purchaseOrders` filtered by supplierId and ordered by date descending.
 *   - Ratings are written back to the `suppliers` document and optimistically
 *     reflected in both the list and the detail view without a full re-fetch.
 */
export default function Suppliers() {
  const [suppliers, setSuppliers]           = useState([]);
  const [orders, setOrders]                 = useState([]);       // purchase orders for the selected supplier
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // null = list view, object = detail view
  const [adminRating, setAdminRating]       = useState(0);        // current rating for the selected supplier

  /**
   * Fetches all supplier documents from the `suppliers` collection on mount.
   * The full list is stored in state; client-side filtering is then applied
   * via the search term without additional Firestore queries.
   */
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "suppliers"));
        setSuppliers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading suppliers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  /**
   * Fetches purchase orders for the selected supplier whenever the selection changes.
   * The query uses supplierId, falling back to the document ID if userId is absent.
   * Each order's date is normalised to a locale string, preferring orderDate over
   * createdAt, and falling back to "N/A" if neither Timestamp is available.
   * Also initialises adminRating from the supplier's stored rating value.
   */
  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedSupplier) return;
      try {
        const q = query(
          collection(db, "purchaseOrders"),
          // Use userId if present (Auth UID); fall back to Firestore document ID
          where("supplierId", "==", selectedSupplier.userId || selectedSupplier.id),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setOrders(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            // Normalise the display date: prefer orderDate, then createdAt, then "N/A"
            date: d.data().orderDate?.toDate
              ? d.data().orderDate.toDate().toLocaleDateString()
              : d.data().createdAt?.toDate
              ? d.data().createdAt.toDate().toLocaleDateString()
              : "N/A",
          }))
        );
        // Seed the rating control with the supplier's existing rating, defaulting to 0
        setAdminRating(selectedSupplier.rating || 0);
      } catch (err) {
        console.error("Error loading orders:", err);
        alert("Failed to load orders: " + err.message);
      }
    };
    fetchOrders();
  }, [selectedSupplier]);

  /**
   * Updates the admin rating for the selected supplier in Firestore and
   * optimistically reflects the change in both the suppliers list and the
   * selected supplier object to avoid a full re-fetch.
   *
   * @param {number} value - The new rating value chosen by the admin.
   */
  const handleRating = async (value) => {
    try {
      setAdminRating(value);
      await updateDoc(doc(db, "suppliers", selectedSupplier.id), { rating: value });

      // Optimistically update the supplier in the list so the card reflects the new rating
      setSuppliers((prev) =>
        prev.map((s) => (s.id === selectedSupplier.id ? { ...s, rating: value } : s))
      );
      // Also update the selected supplier so the detail view stays in sync
      setSelectedSupplier((prev) => ({ ...prev, rating: value }));
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  };

  /**
   * Filters the supplier list client-side by the current search term,
   * matching against the supplier's name or email (case-insensitive).
   * Falls back to an empty string if both fields are absent.
   */
  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Loading state — shown while the initial supplier fetch is in progress
  if (loading)
    return <div className="p-8 text-slate-500 text-lg">Loading suppliers...</div>;

  // Detail view — rendered when a supplier is selected; replaces the list entirely
  if (selectedSupplier)
    return (
      <SupplierDetail
        supplier={selectedSupplier}
        orders={orders}
        adminRating={adminRating}
        onRating={handleRating}
        onBack={() => setSelectedSupplier(null)}
      />
    );

  // List view — default state showing the searchable supplier grid
  return (
    <div className="p-8 bg-slate-50 min-h-screen max-w-[1400px] mx-auto">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Supplier Management</h1>
        <p className="text-slate-500 text-[15px]">Manage and view all registered suppliers</p>
      </div>

      {/* Search Bar and Result Count Badge */}
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search suppliers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        {/* Live count reflects the number of suppliers matching the current search term */}
        <div className="bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold text-sm">
          {filteredSuppliers.length} Suppliers
        </div>
      </div>

      {/* Supplier Grid — empty state shown when no suppliers match the search term */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <p className="text-lg text-slate-500">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onView={() => setSelectedSupplier(supplier)}
            />
          ))}
        </div>
      )}
    </div>
  );
}