import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Products from "./Products";

// ─── Mock Firebase ────────────────────────────────────────────────────────────

vi.mock("../../services/firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  updateDoc:   vi.fn(),
  addDoc:      vi.fn(),
  doc:         vi.fn(() => ({ id: "mocked-doc-ref" })),
  getDoc:      vi.fn(),
  query:       vi.fn(),
  where:       vi.fn(),
  onSnapshot:  vi.fn(() => vi.fn()),
  Timestamp:   { now: vi.fn(() => ({ toMillis: () => Date.now() })) },
}));

import {
  getDocs, getDoc, addDoc, updateDoc, onSnapshot,
} from "firebase/firestore";

// ─── Sample Data ──────────────────────────────────────────────────────────────

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
  availability: "in stock",
};

const mockGetDocs = (products) => {
  getDocs.mockResolvedValue({
    docs: products.map((p) => ({ id: p.id, data: () => p })),
  });
};

const mockGetDoc = (product) => {
  getDoc.mockResolvedValue({
    data: () => product,
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Products Component", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    onSnapshot.mockImplementation((q, cb) => {
      cb({ docs: [] });
      return vi.fn();
    });
  });

  // ── 1. Rendering ─────────────────────────────────────────────────────────────

  it("renders the page header", async () => {
    mockGetDocs([]);
    render(<Products />);
    expect(screen.getByText("Inventory Management")).toBeInTheDocument();
  });

  it("renders all category filter buttons", async () => {
    mockGetDocs([]);
    render(<Products />);
    ["All", "Medicine", "Baby Items", "Skin Care", "Medical Equipment"].forEach((cat) => {
      expect(screen.getAllByText(cat)[0]).toBeInTheDocument();
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

  // ── 2. Product List Display ───────────────────────────────────────────────────

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
      expect(screen.getAllByText("Order Now")).toHaveLength(1);
    });
  });

  // ── 3. Search Filtering ───────────────────────────────────────────────────────

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

  // ── 4. Category Filtering ─────────────────────────────────────────────────────

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

    // "Skin Care" appears in both the filter button and the table cell —
    // [0] targets the filter button
    fireEvent.click(screen.getAllByText("Skin Care")[0]);

    expect(screen.getByText("Face Cream")).toBeInTheDocument();
    expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("shows all products when 'All' category is selected", async () => {
    mockGetDocs([normalProduct, lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Paracetamol"));

    // "Medicine" appears in both the filter button and table cells —
    // [0] targets the filter button
    fireEvent.click(screen.getAllByText("Medicine")[0]);
    fireEvent.click(screen.getByText("All"));

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
  });

  // ── 5. Order Modal ────────────────────────────────────────────────────────────

  it("opens order modal when 'Order Now' is clicked", async () => {
    mockGetDocs([lowStockProduct]);
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));

    expect(screen.getByText("Restock Order")).toBeInTheDocument();
    // "Ibuprofen" appears in both table row and modal — just confirm presence
    expect(screen.getAllByText("Ibuprofen").length).toBeGreaterThanOrEqual(1);
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

    // Scope to modal container to avoid clashing with table row values
    const modal = screen.getByText("Restock Order").closest("div");
    expect(within(modal).getAllByText("XYZ Suppliers").length).toBeGreaterThanOrEqual(1);
    expect(within(modal).getAllByText(/Rs\. 30\.00/).length).toBeGreaterThanOrEqual(1);
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

  // ── 6. Place Order ────────────────────────────────────────────────────────────

  it("shows alert for invalid (zero) quantity", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc(lowStockProduct);
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.click(screen.getByText("Place Order"));

    expect(window.alert).toHaveBeenCalledWith("Enter valid quantity");
  });

  it("shows alert when quantity exceeds supplier stock", async () => {
    mockGetDocs([lowStockProduct]);
    mockGetDoc({ ...lowStockProduct, minStock: 50 });
    window.alert = vi.fn();
    render(<Products />);
    await waitFor(() => screen.getByText("Order Now"));

    fireEvent.click(screen.getByText("Order Now"));
    fireEvent.change(screen.getByPlaceholderText("Enter quantity"), {
      target: { value: "100" },
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

  it("calls addDoc at least twice when placing an order (order + notification)", async () => {
    // Component calls addDoc on mount for the low-stock notification (2 calls),
    // then 2 more when placing the order — total 4
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
      expect(addDoc).toHaveBeenCalledTimes(4); // 2 on mount (low-stock) + 2 on place order
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

  // ── 7. Auto Low Stock Check ───────────────────────────────────────────────────

  it("calls updateDoc for products with stock <= 100 not yet flagged", async () => {
    mockGetDocs([lowStockProduct]);
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: "notif-1" });
    render(<Products />);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: "mocked-doc-ref" }),
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

  // ── 8. Order Status Badge ─────────────────────────────────────────────────────

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