import { create } from "zustand";

const API = "http://localhost:5000/api/cart";

// ==============================
// Reads Firebase UID from sessionStorage
// AuthContext sets this on login: sessionStorage.setItem("userId", user.uid)
// ==============================
const getCustomerId = () => {
  return sessionStorage.getItem("userId") ?? null;
};

export const useCartStore = create((set, get) => ({
  items: [],

  fetchItems: async (customerId) => {
    if (!customerId) return;
    try {
      const res = await fetch(`${API}/${customerId}`);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      set({ items: data });
    } catch (err) {
      console.error("fetchItems error:", err);
    }
  },

  addItem: async (product, delta = 1) => {
    const customerId = getCustomerId();
    if (!customerId) return console.error("No customerId found");

    const productId = product.productCode || product.productId || product.id;
    const existing  = get().items.find((i) => i.productId === productId);

    if (existing) {
      const newQty   = existing.qty + delta;
      const stockKey = existing.stockId || product.stockId || product.productCode || product.productId || product.id || "";

      set((state) => ({
        items: state.items
          .map((i) =>
            i.productId === productId ? { ...i, qty: Math.max(0, newQty) } : i
          )
          .filter((i) => i.qty > 0),
      }));

      try {
        if (newQty <= 0) {
          await fetch(`${API}/${existing.id}`, { method: "DELETE" });
        } else {
          await fetch(`${API}/${existing.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ qty: newQty }),
          });
        }

        if (delta > 0) {
          await fetch(
            `${API.replace('/cart', '/products')}/${encodeURIComponent(stockKey)}/decrement-stock`,
            {
              method:  'PUT',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ quantity: delta }),
            }
          );
        } else if (delta < 0) {
          await fetch(
            `${API.replace('/cart', '/products')}/${encodeURIComponent(stockKey)}/increment-stock`,
            {
              method:  'PUT',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ quantity: Math.abs(delta) }),
            }
          );
        }
      } catch (err) {
        console.error("updateQty stock error:", err);
        get().fetchItems(customerId);
      }

      return;
    }

    const newItem = {
      customerId,
      productId,
      stockId:  product.stockId || product.productCode || product.productId || product.id || "",
      name:     product.name,
      price:    product.retailPrice ?? product.price,
      imageUrl: product.imageUrl ?? "",
      qty:      1,
    };

    try {
      const res = await fetch(API, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const saved = await res.json();
      set((state) => ({ items: [...state.items, saved] }));
    } catch (err) {
      console.error("addItem error:", err);
    }
  },

  removeItem: async (firestoreId) => {
    const customerId = getCustomerId();

    set((state) => ({
      items: state.items.filter((i) => i.id !== firestoreId),
    }));

    try {
      await fetch(`${API}/${firestoreId}`, { method: "DELETE" });
    } catch (err) {
      console.error("removeItem error:", err);
      get().fetchItems(customerId);
    }
  },

  clearCart: async (customerId) => {
    if (!customerId) return console.error("No customerId found");

    set({ items: [] });

    try {
      await fetch(`${API}/clear/${customerId}`, { method: "DELETE" });
    } catch (err) {
      console.error("clearCart error:", err);
      get().fetchItems(customerId);
    }
  },

  getTotal: () =>
    get().items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.qty || 0),
      0
    ),
}));