import "./Products.css";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";

const CATEGORIES = [
  "All",
  "Medicine",
  "Baby Items",
  "Skin Care",
  "Medical Equipment",
];

const normalize = (v = "") => v.toLowerCase().replace(/\s+/g, "");

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const snap = await getDocs(collection(db, "products"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setProducts(list);
    autoLowStockCheck(list);
  };

  // 🔔 LOW STOCK CHECK (SAFE)
  const autoLowStockCheck = async (items) => {
    for (const p of items) {
      if (
        p.stock <= p.minStock &&
        p.availability !== "LOW STOCK"
      ) {
        await updateDoc(doc(db, "products", p.id), {
          availability: "LOW STOCK",
          updatedAt: Timestamp.now(),
        });

        if (p.supplierId) {
          await addDoc(collection(db, "notifications"), {
            type: "LOW_STOCK",
            productId: p.id,
            supplierId: p.supplierId,
            message: `LOW STOCK ALERT: ${p.productName} (Stock: ${p.stock})`,
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
    }
  };

  const openOrderForm = (product) => {
    if (!product.supplierId) {
      alert("❌ This product has no supplier assigned");
      return;
    }
    setSelectedProduct(product);
    setOrderQty("");
    setShowOrderForm(true);
  };

  // 🛒 PLACE ORDER (FIXED)
  const placeOrder = async () => {
    if (!orderQty || Number(orderQty) <= 0) {
      alert("Enter valid quantity");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "purchaseOrders"), {
        poId: `PO-${Date.now()}`,
        product: selectedProduct.productName,
        productId: selectedProduct.id,
        category: selectedProduct.category,
        quantity: Number(orderQty),
        reorderLevel: selectedProduct.minStock,
        supplierId: selectedProduct.supplierId,
        supplierName: selectedProduct.supplierName || "Unknown Supplier",
        unitPrice: Number(selectedProduct.wholesalePrice),
        amount:
          Number(orderQty) * Number(selectedProduct.wholesalePrice),
        pharmacy: "MediCareX",
        status: "PENDING",
        inStatus: "LOW STOCK",
        date: new Date().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert("✅ Order successfully sent to supplier");
      setShowOrderForm(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to place order. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.productName?.toLowerCase().includes(search.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      category === "All" ||
      normalize(p.category) === normalize(category);

    return matchSearch && matchCategory;
  });

  return (
    <div className="product-page">
      <h1>Inventory Management</h1>

      <input
        className="search-input"
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="category-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={category === cat ? "active" : ""}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>PRODUCT</th>
            <th>CATEGORY</th>
            <th>STOCK</th>
            <th>REORDER</th>
            <th>SUPPLIER</th>
            <th>PRICE</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.productCode}</td>
              <td>{p.productName}</td>
              <td>{p.category}</td>
              <td className={p.stock <= p.minStock ? "low" : ""}>
                {p.stock}
              </td>
              <td>{p.minStock}</td>
              <td>{p.supplierId || "—"}</td>
              <td>Rs. {p.wholesalePrice}</td>
              <td>
                {p.stock <= p.minStock && (
                  <button
                    className="alert-btn"
                    onClick={() => openOrderForm(p)}
                  >
                    Alert & Order
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showOrderForm && selectedProduct && (
        <div className="modal">
          <div className="modal-box">
            <h3>Restock Order</h3>

            <p><b>{selectedProduct.productName}</b></p>
            <p>Supplier: {selectedProduct.supplierId}</p>

            <input
              type="number"
              placeholder="Quantity"
              value={orderQty}
              onChange={e => setOrderQty(e.target.value)}
            />

            <p>
              Total: Rs.
              {orderQty * selectedProduct.wholesalePrice || 0}
            </p>

            <button
              className="confirm"
              onClick={placeOrder}
              disabled={loading}
            >
              {loading ? "Placing..." : "Place Order"}
            </button>

            <button
              className="cancel"
              onClick={() => setShowOrderForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
