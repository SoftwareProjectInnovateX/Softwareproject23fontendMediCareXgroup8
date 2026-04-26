import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === product.productCode);

          if (existing) {
            // Increment qty if item already in cart
            return {
              items: state.items.map((i) =>
                i.id === product.productCode ? { ...i, qty: i.qty + 1 } : i
              ),
            };
          }

          // Otherwise add as new entry
          return {
            items: [
              ...state.items,
              {
                id:       product.productCode,
                name:     product.name,
                price:    product.price,
                imageUrl: product.imageUrl,
                qty:      1,
              },
            ],
          };
        });
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce(
          (sum, item) => sum + (item.price || 0) * (item.qty || 0),
          0
        ),
    }),
    {
      name: "cart-storage",
    }
  )
);