import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { SupplierCard } from "../../components/admin/SupplierCard";
import { SupplierDetail } from "../../components/admin/SupplierDetail";

export default function Suppliers() {
  const [suppliers, setSuppliers]               = useState([]);
  const [orders, setOrders]                     = useState([]);       // purchase orders for the selected supplier
  const [search, setSearch]                     = useState("");
  const [loading, setLoading]                   = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);     // null = list view, object = detail view
  const [adminRating, setAdminRating]           = useState(0);        // current rating for the selected supplier

  // Fetch all suppliers from Firestore on mount; filtering is done client-side
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

  // Fetch purchase orders for the selected supplier whenever selection changes
  // Normalises the display date and seeds the rating control from stored value
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
            // Prefer orderDate, then createdAt, then "N/A" for display
            date: d.data().orderDate?.toDate
              ? d.data().orderDate.toDate().toLocaleDateString()
              : d.data().createdAt?.toDate
              ? d.data().createdAt.toDate().toLocaleDateString()
              : "N/A",
          }))
        );
        // Seed rating with the supplier's existing value, defaulting to 0
        setAdminRating(selectedSupplier.rating || 0);
      } catch (err) {
        console.error("Error loading orders:", err);
        alert("Failed to load orders: " + err.message);
      }
    };
    fetchOrders();
  }, [selectedSupplier]);

  // Writes the new rating to Firestore and optimistically updates both the
  // suppliers list and selected supplier to avoid a full re-fetch
  const handleRating = async (value) => {
    try {
      setAdminRating(value);
      await updateDoc(doc(db, "suppliers", selectedSupplier.id), { rating: value });

      // Update the card in the list
      setSuppliers((prev) =>
        prev.map((s) => (s.id === selectedSupplier.id ? { ...s, rating: value } : s))
      );
      // Keep the detail view in sync
      setSelectedSupplier((prev) => ({ ...prev, rating: value }));
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  };

  // Filter suppliers client-side by name or email against the search term
  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Loading state — shown while initial supplier fetch is in progress
  if (loading)
    return <div className="p-8 text-slate-500 text-lg">Loading suppliers...</div>;

  // Detail view — replaces the list when a supplier is selected
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

  // Default list view — searchable supplier grid
  return (
    <div className="p-8 bg-slate-50 min-h-screen max-w-[1400px] mx-auto">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Supplier Management</h1>
        <p className="text-slate-500 text-[15px]">Manage and view all registered suppliers</p>
      </div>

      {/* Search bar and live result count */}
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search suppliers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        {/* Count updates live as the search term changes */}
        <div className="bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold text-sm">
          {filteredSuppliers.length} Suppliers
        </div>
      </div>

      {/* Supplier grid — empty state shown when no suppliers match the search */}
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