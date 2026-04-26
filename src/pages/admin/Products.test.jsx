import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Products from "./Products";

// ─── Mock Firebase ────────────────────────────────────────────────────────────

vi.mock("../../services/firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  updateDoc:   vi.fn(),
  addDoc:      vi.fn(),
  doc:         vi.fn(),
  getDoc:      vi.fn(),
  query:       vi.fn(),
  where:       vi.fn(),
  onSnapshot:  vi.fn(() => vi.fn()), // returns unsubscribe fn
  Timestamp:   { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
}));

import {
  getDocs, getDoc, addDoc, updateDoc, onSnapshot,
} from "firebase/firestore";

// ─── Sample Data ──────────────────────────────────────────────────────────────

// A normal product (stock > 100, no low stock)
const normalProduct = {
  id: "prod-1",
  productCode: "MED-001",
  productName: "Paracetamol",
  category: "Medicine",
  manufacturer: "PharmaCo",
  supplierName: "ABC Suppliers",
  supplierId: "sup-1",
  productId: "p-1",
  stock: 500,
  minStock: 200,
  wholesalePrice: 50,
  retailPrice: 60,
  availability: "in stock",
};

// A low stock product (stock <= 100)
const lowStockProduct = {
  id: "prod-2",
  productCode: "MED-002",
  productName: "Ibuprofen",
  category: "Medicine",
  manufacturer: "MediLab",
  supplierName: "XYZ Suppliers",
  supplierId: "sup-2",
  productId: "p-2",
  stock: 80,
  minStock: 150,
  wholesalePrice: 30,
  retailPrice: 36,
  availability: "in stock", // not yet flagged
};

// Helper: mock getDocs to return a list of products
const mockGetDocs = (products) => {
  getDocs.mockResolvedValue({
    docs: products.map((p) => ({ id: p.id, data: () => p })),
  });
};

// Helper: mock getDoc to return a single product's latest data
const mockGetDoc = (product) => {
  getDoc.mockResolvedValue({
    data: () => product,
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Products Component", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no pending orders
    onSnapshot.mockImplementation((q, cb) => {
      cb({ docs: [] });
      return vi.fn();
    });
  });

  // ── 1. Rendering ────────────────────────────────────────────────────────────

  it("renders the page header", async () => {
    mockGetDocs([]);
    render(<Products />);
    expect(screen.getByText("Inventory Management")).toBeInTheDocument();
  });

  it("renders all category filter buttons", async () => {
    mockGetDocs([]);
    render(<Products />);
    ["All", "Medicine", "Baby Items", "Skin Care", "Medical Equipment"].forEach((cat) => {
      expect(screen.getByText(cat)).toBeInTheDocument();
    });
  });

  it("renders the search input", async () => {
    mockGetDocs([]);
    render(<Products />);
    expect(screen.getByPlaceholderText("Search products...")).toBeInTheDocument();
  });

  it("shows 'No products found' when product list is empty", async () => {
    mockGetDocs([]);
    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("No products found")).toBeInTheDocument();
    });
  });

  // ── 2. Product List Display ──────────────────────────────────────────────────

  it("displays a product row after loading", async () => {
    mockGetDocs([normalProduct]);
    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("Paracetamol")).toBeInTheDocument();
      expect(screen.getByText("PharmaCo")).toBeInTheDocument();
      expect(screen.getByText("MED-001")).toBeInTheDocument();
    });
  });

  it("shows LOW badge for products with stock <= 100", async () => {
    mockGetDocs([lowStockProduct]);
    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("LOW")).toBeInTheDocument();
    });
  });

  it("does NOT show LOW badge for normal stock products", async () => {
    mockGetDocs([normalProduct]);
    render(<Products />);
    await waitFor(() => {
      expect(screen.queryByText("LOW")).not.toBeInTheDocument();
    });
  });

  it("shows 'Order Now' button only for low stock products", async () => {
    mockGetDocs([normalProduct, lowStockProduct]);
    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("Order Now")).toBeInTheDocument();
      // Only one Order Now button — for Ibuprofen, not Paracetamol
      expect(screen.getAllByText("Order Now")).toHaveLength(1);
    });
  });

  // ── 3. Search Filtering ──────────────────────────────────────────────────────

  it("filters products by product name", async () => {
    mockGetDocs([normalProduct, lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.change(screen.getByPlaceholderText("Search products..."), {
      target: { value: "Ibuprofen" },
    });

    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
    expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("filters products by supplier name", async () => {
    mockGetDocs([normalProduct, lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.change(screen.getByPlaceholderText("Search products..."), {
      target: { value: "ABC" },
    });

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.queryByText("Ibuprofen")).not.toBeInTheDocument();
  });

  it("shows 'No products found' when search has no match", async () => {
    mockGetDocs([normalProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.change(screen.getByPlaceholderText("Search products..."), {
      target: { value: "zzznomatch" },
    });

    expect(screen.getByText("No products found")).toBeInTheDocument();
  });

  // ── 4. Category Filtering ────────────────────────────────────────────────────

  it("filters products by category", async () => {
    const skinProduct = {
      ...normalProduct,
      id: "prod-3",
      productName: "Face Cream",
      category: "Skin Care",
    };
    mockGetDocs([normalProduct, skinProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.click(screen.getByText("Skin Care"));

    expect(screen.getByText("Face Cream")).toBeInTheDocument();
    expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("shows all products when 'All' category is selected", async () => {
    mockGetDocs([normalProduct, lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.click(screen.getByText("Medicine")); // narrow down
    fireEvent.click(screen.getByText("All"));      // reset

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
  });

  // ── 5. Order Modal ───────────────────────────────────────────────────────────

  it("opens order modal when 'Order Now' is clicked", async () => {
    mockGetDocs([lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));

    expect(screen.getByText("Restock Order")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
  });

  it("closes the modal when Cancel is clicked", async () => {
    mockGetDocs([lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Restock Order")).not.toBeInTheDocument();
  });

  it("shows correct product info inside the order modal", async () => {
    mockGetDocs([lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));

    expect(screen.getByText("XYZ Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Rs. 30.00")).toBeInTheDocument(); // unit price
  });

  it("shows alert when product has no supplierId", async () => {
    const noSupplierProduct = { ...lowStockProduct, supplierId: null };
    mockGetDocs([noSupplierProduct]);
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));

    expect(window.alert).toHaveBeenCalledWith("This product has no supplier assigned");
  });

  // ── 6. Place Order ───────────────────────────────────────────────────────────

  it("shows alert for invalid (zero) quantity", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc(lowStockProduct);
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.click(screen.getByText("Place Order")); // no qty entered

    expect(window.alert).toHaveBeenCalledWith("Enter valid quantity");
  });

  it("shows alert when quantity exceeds supplier stock", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc({ ...lowStockProduct, minStock: 50 }); // supplier only has 50
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
      target: { value: "100" }, // trying to order more than available
    });
    fireEvent.click(screen.getByText("Place Order"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Supplier only has 50 units")
      );
    });
  });

  it("successfully places an order and shows success alert", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc({ ...lowStockProduct, minStock: 150 });
    addDoc.mockResolvedValue({ id: "order-123" });
    updateDoc.mockResolvedValue();
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByText("Place Order"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Order successfully placed and supplier has been notified"
      );
    });
  });

  it("calls addDoc twice when placing an order (order + notification)", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc({ ...lowStockProduct, minStock: 150 });
    addDoc.mockResolvedValue({ id: "order-123" });
    updateDoc.mockResolvedValue();
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByText("Place Order"));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(2); // purchase order + notification
    });
  });

  it("closes the modal after a successful order", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc({ ...lowStockProduct, minStock: 150 });
    addDoc.mockResolvedValue({ id: "order-123" });
    updateDoc.mockResolvedValue();
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByText("Place Order"));

    await waitFor(() => {
      expect(screen.queryByText("Restock Order")).not.toBeInTheDocument();
    });
  });

  // ── 7. Auto Low Stock Check ──────────────────────────────────────────────────

  it("calls updateDoc for products with stock <= 100 not yet flagged", async () => {
    mockGetDocs([lowStockProduct]); // stock: 80, availability: "in stock" (not flagged)
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: "notif-1" });
    render(<Products />);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ availability: "LOW STOCK" })
      );
    });
  });

  it("does NOT call updateDoc for products already flagged as LOW STOCK", async () => {
    const alreadyFlagged = { ...lowStockProduct, availability: "LOW STOCK" };
    mockGetDocs([alreadyFlagged]);
    updateDoc.mockResolvedValue();
    render(<Products />);

    await waitFor(() => screen.getByText("Ibuprofen"));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ── 8. Order Status Badge ────────────────────────────────────────────────────

  it("shows 'Order Sent' button when a PENDING order exists for a product", async () => {
    mockGetDocs([lowStockProduct]);
    onSnapshot.mockImplementation((q, cb) => {
      cb({
        docs: [{
          id: "order-1",
          data: () => ({
            adminProductId: "prod-2",
            status: "PENDING",
            quantity: 50,
            createdAt: { toMillis: () => Date.now() },
          }),
        }],
      });
      return vi.fn();
    });

    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("Order Sent")).toBeInTheDocument();
    });
  });

  it("shows Pending status badge when order is PENDING", async () => {
    mockGetDocs([lowStockProduct]);
    onSnapshot.mockImplementation((q, cb) => {
      cb({
        docs: [{
          id: "order-1",
          data: () => ({
            adminProductId: "prod-2",
            status: "PENDING",
            quantity: 50,
            createdAt: { toMillis: () => Date.now() },
          }),
        }],
      });
      return vi.fn();
    });

    render(<Products />);
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

});
