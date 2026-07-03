import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { SupplierCard } from "../../components/admin/SupplierCard";
import { SupplierDetail } from "../../components/admin/SupplierDetail";
import PageLayout from "../../components/PageLayout";

const SUPPLIERS_PER_PAGE = 6;

export default function Suppliers() {
  const [suppliers, setSuppliers]               = useState([]);
  const [orders, setOrders]                     = useState([]);       // purchase orders for the selected supplier
  const [search, setSearch]                     = useState("");
  const [loading, setLoading]                   = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);     // null = list view, object = detail view
  const [adminRating, setAdminRating]           = useState(0);        // current rating for the selected supplier
  const [currentPage, setCurrentPage]           = useState(0);        // pagination index for the supplier grid

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

  // Reset to the first page whenever the search term changes, so a new
  // search never lands the user on a page that's now out of range
  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / SUPPLIERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const paginatedSuppliers = filteredSuppliers.slice(
    safePage * SUPPLIERS_PER_PAGE,
    safePage * SUPPLIERS_PER_PAGE + SUPPLIERS_PER_PAGE
  );

  const goToPrevPage = () => setCurrentPage((p) => Math.max(0, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1));

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

  // Default list view — searchable, paginated supplier grid
  return (
    <PageLayout
      title="Supplier Management"
      subtitle="Manage and view all registered suppliers"
      actions={
        <div className="bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold text-sm">
          {filteredSuppliers.length} Suppliers
        </div>
      }
    >
      <div className="max-w-[1400px] mx-auto">

        {/* Search bar */}
        <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search suppliers by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[300px] px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Supplier grid — empty state shown when no suppliers match the search */}
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-lg text-slate-500">No suppliers found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onView={() => setSelectedSupplier(supplier)}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Showing {safePage * SUPPLIERS_PER_PAGE + 1}
                  –{Math.min(safePage * SUPPLIERS_PER_PAGE + SUPPLIERS_PER_PAGE, filteredSuppliers.length)}
                  {" "}of {filteredSuppliers.length} suppliers
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={goToPrevPage}
                    disabled={safePage === 0}
                    className="px-4 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-indigo-500 hover:text-indigo-500 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 disabled:cursor-not-allowed"
                  >
                    &lt;&lt;
                  </button>

                  <span className="text-sm font-medium text-slate-500">
                    Page {safePage + 1} of {totalPages}
                  </span>

                  <button
                    onClick={goToNextPage}
                    disabled={safePage >= totalPages - 1}
                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold transition-all duration-200 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed"
                  >
                    &gt;&gt;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}