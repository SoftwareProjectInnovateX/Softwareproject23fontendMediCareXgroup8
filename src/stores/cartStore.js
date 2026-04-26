import { create } from "zustand";

const API = "http://localhost:5000/api/cart";

// ==============================
// NO persist middleware — always
// load fresh from backend on mount
// ==============================
export const useCartStore = create((set, get) => ({
  items: [],

  // ==============================
  // LOAD ITEMS FROM BACKEND
  // Always called on CartPage mount
  // ==============================
  fetchItems: async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("Failed to fetch cart");
      const data = await res.json();
      set({ items: data });
    } catch (err) {
      console.error("fetchItems error:", err);
    }
  },

  // ==============================
  // ADD ITEM
  // productId = product's own code (stored in Firestore doc)
  // id        = Firestore auto-generated doc ID (used for delete)
  // ==============================
  addItem: async (product, delta = 1) => {
    const productId = product.productCode || product.productId || product.id;
    const existing  = get().items.find((i) => i.productId === productId);

    if (existing) {
      const newQty = existing.qty + delta;

      // 1. Optimistic local update
      set((state) => ({
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, qty: newQty } : i
        ),
      }));

      // 2. Persist to Firestore
      try {
        await fetch(`${API}/${existing.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ qty: newQty }),
        });
      } catch (err) {
        console.error("updateQty error:", err);
        get().fetchItems(); // rollback on failure
      }

      return;
    }

    const newItem = {
      productId,
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
      // saved.id = Firestore doc ID — this is what removeItem uses
      set((state) => ({ items: [...state.items, saved] }));
    } catch (err) {
      console.error("addItem error:", err);
    }
  },

  // ==============================
  // REMOVE ITEM
  // firestoreId = item.id returned by backend (Firestore doc ID)
  // ==============================
  removeItem: async (firestoreId) => {
    // Optimistically remove from UI first
    set((state) => ({
      items: state.items.filter((i) => i.id !== firestoreId),
    }));

    try {
      await fetch(`${API}/${firestoreId}`, { method: "DELETE" });
      // No need to check res.ok — backend silently succeeds even if doc missing
    } catch (err) {
      console.error("removeItem error:", err);
      // Optionally re-fetch to restore state on network failure
      get().fetchItems();
    }
  },

  // ==============================
  // CLEAR CART
  // ==============================
  clearCart: async () => {
    // Optimistically clear UI first
    set({ items: [] });

    try {
      await fetch(API, { method: "DELETE" });
    } catch (err) {
      console.error("clearCart error:", err);
      get().fetchItems();
    }
  },

  // ==============================
  // GET TOTAL
  // ==============================
  getTotal: () =>
    get().items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.qty || 0),
      0
    ),
}));