import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? { ...i, qty: i.qty + qty }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, { ...product, qty }],
          };
        });
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.price || 0) * (item.qty || 0),
          0
        );
      },
    }),
    {
      name: "cart-storage", // 👈 saved in localStorage
    }
  )
);