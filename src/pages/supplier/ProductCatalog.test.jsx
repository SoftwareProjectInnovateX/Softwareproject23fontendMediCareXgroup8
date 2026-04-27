import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ProductCatalog from "./ProductCatalog";

// ─── Mock Firebase Auth ───────────────────────────────────────────────────────

const mockGetIdToken = vi.fn().mockResolvedValue("mock-token");
const mockCurrentUser = { uid: "supplier-123", email: "supplier@test.com", getIdToken: mockGetIdToken };

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({
    currentUser: mockCurrentUser,
    onAuthStateChanged: vi.fn((cb) => { cb(mockCurrentUser); return vi.fn(); }),
  })),
}));

// ─── Mock Firebase Firestore ──────────────────────────────────────────────────

vi.mock("firebase/firestore", () => ({
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  updateDoc:   vi.fn(),
  deleteDoc:   vi.fn(),
  doc:         vi.fn(() => ({ id: "mocked-doc-ref" })),
  query:       vi.fn(),
  orderBy:     vi.fn(),
  where:       vi.fn(),
  Timestamp:   {
    now:      vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    fromDate: vi.fn((d) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
  getDoc:      vi.fn(),
  onSnapshot:  vi.fn(() => vi.fn()),
}));

vi.mock("../../services/firebase", () => ({ db: {} }));

// ─── Mock Child Components ────────────────────────────────────────────────────

vi.mock("../../components/supplier/ProductCatalogHeader", () => ({
  default: function MockHeader({ currentUser }) {
    return (
      <div data-testid="catalog-header">
        <span data-testid="current-user-name">{currentUser?.name || ""}</span>
      </div>
    );
  },
}));

vi.mock("../../components/supplier/SearchAndAdd", () => ({
  default: function MockSearchAndAdd({ searchTerm, setSearchTerm, onAddClick }) {
    return (
      <div data-testid="search-and-add">
        <input
          data-testid="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products"
        />
        <button data-testid="add-product-btn" onClick={onAddClick}>
          Add Product
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/supplier/TabBar", () => ({
  default: function MockTabBar({ activeTab, setActiveTab, productsCount, pendingCount }) {
    return (
      <div data-testid="tab-bar">
        <button
          data-testid="tab-approved"
          onClick={() => setActiveTab("approved")}
          aria-selected={activeTab === "approved"}
        >
          Approved ({productsCount})
        </button>
        <button
          data-testid="tab-pending"
          onClick={() => setActiveTab("pending")}
          aria-selected={activeTab === "pending"}
        >
          Pending ({pendingCount})
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/supplier/ProductTable", () => ({
  default: function MockProductTable({ loading, filteredProducts, onEdit, onDelete, onAddClick }) {
    if (loading) return <div data-testid="product-table-loading">Loading...</div>;
    if (!filteredProducts.length)
      return <div data-testid="product-table-empty">No approved products</div>;
    return (
      <div data-testid="product-table">
        {filteredProducts.map((p) => (
          <div key={p.id} data-testid="product-row">
            <span data-testid={`product-name-${p.id}`}>{p.productName}</span>
            <span data-testid={`product-category-${p.id}`}>{p.category}</span>
            <button data-testid={`edit-btn-${p.id}`} onClick={() => onEdit(p)}>
              Edit
            </button>
            <button
              data-testid={`delete-btn-${p.id}`}
              onClick={() => onDelete(p.id, p.productName)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("../../components/supplier/PendingTable", () => ({
  default: function MockPendingTable({ loading, filteredPending }) {
    if (loading) return <div data-testid="pending-table-loading">Loading...</div>;
    if (!filteredPending.length)
      return <div data-testid="pending-table-empty">No pending products</div>;
    return (
      <div data-testid="pending-table">
        {filteredPending.map((p) => (
          <div key={p.id} data-testid="pending-row">
            <span data-testid={`pending-name-${p.id}`}>{p.productName}</span>
            <span data-testid={`pending-status-${p.id}`}>{p.status}</span>
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("../../components/supplier/ProductModal", () => ({
  default: function MockProductModal({
    showModal, editingProduct, formData, setFormData,
    onSubmitAdd, onSubmitUpdate, onClose,
  }) {
    if (!showModal) return null;
    return (
      <div data-testid="product-modal">
        <h2 data-testid="modal-title">
          {editingProduct ? "Edit Product" : "Add Product"}
        </h2>
        <input
          data-testid="input-productName"
          value={formData.productName}
          onChange={(e) => setFormData((f) => ({ ...f, productName: e.target.value }))}
          placeholder="Product Name"
        />
        <input
          data-testid="input-category"
          value={formData.category}
          onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
          placeholder="Category"
        />
        <input
          data-testid="input-wholesalePrice"
          value={formData.wholesalePrice}
          onChange={(e) => setFormData((f) => ({ ...f, wholesalePrice: e.target.value }))}
          placeholder="Wholesale Price"
        />
        <input
          data-testid="input-stock"
          value={formData.stock}
          onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))}
          placeholder="Stock"
        />
        <input
          data-testid="input-minStock"
          value={formData.minStock}
          onChange={(e) => setFormData((f) => ({ ...f, minStock: e.target.value }))}
          placeholder="Min Stock"
        />
        <button
          data-testid="modal-submit-btn"
          onClick={editingProduct ? onSubmitUpdate : onSubmitAdd}
        >
          {editingProduct ? "Update Product" : "Submit Product"}
        </button>
        <button data-testid="modal-close-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    );
  },
}));

// ─── Mock fetch ───────────────────────────────────────────────────────────────

global.fetch = vi.fn();

// ─── Sample Data ──────────────────────────────────────────────────────────────

const mockSupplierDoc = {
  exists: () => true,
  data:   () => ({ name: "Test Supplier", email: "supplier@test.com" }),
};

const approvedProduct1 = {
  id: "prod-1",
  productName: "Paracetamol",
  category: "Medicine",
  wholesalePrice: 50,
  stock: 500,
  minStock: 100,
  description: "Pain relief",
  manufacturer: "PharmaCo",
  supplierId: "supplier-123",
  availability: "in stock",
};

const approvedProduct2 = {
  id: "prod-2",
  productName: "Ibuprofen",
  category: "Medicine",
  wholesalePrice: 40,
  stock: 300,
  minStock: 80,
  description: "Anti-inflammatory",
  manufacturer: "MediLab",
  supplierId: "supplier-123",
  availability: "in stock",
};

const pendingProduct1 = {
  id: "pend-1",
  productName: "Vitamin C",
  category: "Supplements",
  wholesalePrice: 25,
  stock: 200,
  status: "pending",
  supplierId: "supplier-123",
};

const pendingProduct2 = {
  id: "pend-2",
  productName: "Zinc Tablets",
  category: "Supplements",
  wholesalePrice: 20,
  stock: 150,
  status: "approved",
  supplierId: "supplier-123",
};

// ─── Mock Helpers ─────────────────────────────────────────────────────────────

import {
  getDocs, getDoc, updateDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";

const setupDefaultMocks = ({
  approved = [approvedProduct1, approvedProduct2],
  pending  = [pendingProduct1, pendingProduct2],
} = {}) => {
  // getDoc: supplier profile
  getDoc.mockResolvedValue(mockSupplierDoc);

  // getDocs: approved products fetch + any secondary fetches (adminProducts)
  getDocs.mockResolvedValue({
    docs: approved.map((p) => ({ id: p.id, data: () => p })),
  });

  // onSnapshot: pending products real-time listener
  onSnapshot.mockImplementation((q, successCb, errorCb) => {
    successCb({
      docs: pending.map((p) => ({ id: p.id, data: () => p })),
    });
    return vi.fn(); // unsubscribe
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProductCatalog", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert   = vi.fn();
    window.confirm = vi.fn(() => true);
    global.fetch   = vi.fn().mockResolvedValue({
      ok:   true,
      json: vi.fn().mockResolvedValue({ message: "success" }),
    });
  });

  // ── 1. Page Structure ────────────────────────────────────────────────────────

  describe("Page Structure", () => {
    it("renders the catalog header", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("catalog-header")).toBeInTheDocument()
      );
    });

    it("renders the search and add bar", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("search-and-add")).toBeInTheDocument()
      );
    });

    it("renders the tab bar", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("tab-bar")).toBeInTheDocument()
      );
    });

    it("defaults to the approved tab on first render", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("product-table")).toBeInTheDocument()
      );
    });
  });

  // ── 2. User Details ──────────────────────────────────────────────────────────

  describe("User Details", () => {
    it("loads and displays supplier name from Firestore", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("current-user-name")).toHaveTextContent("Test Supplier")
      );
    });

    it("falls back to 'Supplier' name when supplier doc does not exist", async () => {
      getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
      getDocs.mockResolvedValue({ docs: [] });
      onSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return vi.fn(); });

      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("current-user-name")).toHaveTextContent("Supplier")
      );
    });
  });

  // ── 3. Approved Products Tab ─────────────────────────────────────────────────

  describe("Approved Products Tab", () => {
    // FIX 1: Use getAllByTestId instead of getByTestId since multiple product-row
    // elements exist when there are multiple approved products.
    it("renders approved product rows after loading", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => {
        expect(screen.getAllByTestId("product-row")).toHaveLength(2);
        expect(screen.getByText("Paracetamol")).toBeInTheDocument();
        expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
      });
    });

    it("shows correct approved product count in tab label", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("tab-approved")).toHaveTextContent("Approved (2)")
      );
    });

    it("shows empty state when no approved products exist", async () => {
      setupDefaultMocks({ approved: [] });
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("product-table-empty")).toBeInTheDocument()
      );
    });
  });

  // ── 4. Pending Products Tab ──────────────────────────────────────────────────

  describe("Pending Products Tab", () => {
    it("switches to pending tab and shows pending products", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("tab-bar"));

      fireEvent.click(screen.getByTestId("tab-pending"));

      await waitFor(() => {
        expect(screen.getByTestId("pending-table")).toBeInTheDocument();
        expect(screen.getByText("Vitamin C")).toBeInTheDocument();
        expect(screen.getByText("Zinc Tablets")).toBeInTheDocument();
      });
    });

    it("shows correct pending count (status === 'pending' only)", async () => {
      // pendingProduct1 is 'pending', pendingProduct2 is 'approved' — count = 1
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("tab-pending")).toHaveTextContent("Pending (1)")
      );
    });

    it("shows empty state when no pending products exist", async () => {
      setupDefaultMocks({ pending: [] });
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("tab-bar"));

      fireEvent.click(screen.getByTestId("tab-pending"));

      await waitFor(() =>
        expect(screen.getByTestId("pending-table-empty")).toBeInTheDocument()
      );
    });
  });

  // ── 5. Search Filtering ──────────────────────────────────────────────────────

  describe("Search Filtering", () => {
    it("filters approved products by product name", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByText("Paracetamol"));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "Paracetamol" },
      });

      await waitFor(() => {
        expect(screen.getByText("Paracetamol")).toBeInTheDocument();
        expect(screen.queryByText("Ibuprofen")).not.toBeInTheDocument();
      });
    });

    it("filters approved products by category", async () => {
      const skinProduct = {
        ...approvedProduct1, id: "prod-3", productName: "Face Cream", category: "Skin Care",
      };
      setupDefaultMocks({ approved: [approvedProduct1, skinProduct] });
      render(<ProductCatalog />);
      await waitFor(() => screen.getByText("Paracetamol"));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "Skin Care" },
      });

      await waitFor(() => {
        expect(screen.getByText("Face Cream")).toBeInTheDocument();
        expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
      });
    });

    it("shows empty state when search has no match", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByText("Paracetamol"));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "zzznomatch" },
      });

      await waitFor(() =>
        expect(screen.getByTestId("product-table-empty")).toBeInTheDocument()
      );
    });

    it("filters pending products by name when on pending tab", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("tab-bar"));

      fireEvent.click(screen.getByTestId("tab-pending"));
      await waitFor(() => screen.getByText("Vitamin C"));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "Zinc" },
      });

      await waitFor(() => {
        expect(screen.getByText("Zinc Tablets")).toBeInTheDocument();
        expect(screen.queryByText("Vitamin C")).not.toBeInTheDocument();
      });
    });
  });

  // ── 6. Add Product Modal ─────────────────────────────────────────────────────

  describe("Add Product Modal", () => {
    it("opens the modal when Add Product is clicked", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));

      expect(screen.getByTestId("product-modal")).toBeInTheDocument();
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Add Product");
    });

    it("closes the modal when Cancel is clicked", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.click(screen.getByTestId("modal-close-btn"));

      expect(screen.queryByTestId("product-modal")).not.toBeInTheDocument();
    });

    it("shows alert when required fields are missing", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.click(screen.getByTestId("modal-submit-btn")); // no fields filled

      expect(window.alert).toHaveBeenCalledWith("Please fill in all required fields");
    });

    it("calls fetch API when valid form is submitted", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"),    { target: { value: "Aspirin" } });
      fireEvent.change(screen.getByTestId("input-category"),       { target: { value: "Medicine" } });
      fireEvent.change(screen.getByTestId("input-wholesalePrice"), { target: { value: "35" } });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/supplier/products"),
          expect.objectContaining({ method: "POST" })
        )
      );
    });

    it("shows success alert after successful product submission", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"),    { target: { value: "Aspirin" } });
      fireEvent.change(screen.getByTestId("input-category"),       { target: { value: "Medicine" } });
      fireEvent.change(screen.getByTestId("input-wholesalePrice"), { target: { value: "35" } });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining("Product submitted for admin approval")
        )
      );
    });

    it("closes modal and switches to pending tab after successful submission", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"),    { target: { value: "Aspirin" } });
      fireEvent.change(screen.getByTestId("input-category"),       { target: { value: "Medicine" } });
      fireEvent.change(screen.getByTestId("input-wholesalePrice"), { target: { value: "35" } });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("product-modal")).not.toBeInTheDocument();
        expect(screen.getByTestId("pending-table")).toBeInTheDocument();
      });
    });

    it("shows error alert when fetch API fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok:   false,
        json: vi.fn().mockResolvedValue({ message: "Server error" }),
      });
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"),    { target: { value: "Aspirin" } });
      fireEvent.change(screen.getByTestId("input-category"),       { target: { value: "Medicine" } });
      fireEvent.change(screen.getByTestId("input-wholesalePrice"), { target: { value: "35" } });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining("Failed to submit product")
        )
      );
    });
  });

  // ── 7. Edit Product Modal ────────────────────────────────────────────────────

  describe("Edit Product Modal", () => {
    it("opens edit modal with correct title when Edit is clicked", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));

      expect(screen.getByTestId("product-modal")).toBeInTheDocument();
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Edit Product");
    });

    it("pre-fills form fields with product data when editing", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));

      expect(screen.getByTestId("input-productName")).toHaveValue("Paracetamol");
      expect(screen.getByTestId("input-category")).toHaveValue("Medicine");
      expect(screen.getByTestId("input-wholesalePrice")).toHaveValue("50");
    });

    it("calls updateDoc when update form is submitted", async () => {
      updateDoc.mockResolvedValue();
      // second getDocs for adminProducts lookup
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1, approvedProduct2].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({ docs: [] }); // adminProducts query returns empty

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));
      fireEvent.change(screen.getByTestId("input-productName"), {
        target: { value: "Paracetamol Updated" },
      });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ id: "mocked-doc-ref" }),
          expect.objectContaining({ productName: "Paracetamol Updated" })
        )
      );
    });

    // FIX 2: Mock adminProducts getDocs to return a matching document so that
    // the production code can read adminDoc.id without throwing.
    it("shows success alert after updating a product", async () => {
      updateDoc.mockResolvedValue();
      getDoc.mockResolvedValue(mockSupplierDoc);
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({
          // adminProducts lookup — return a matching doc so adminDoc.id is defined
          docs: [{ id: "admin-prod-1", data: () => ({ ...approvedProduct1 }) }],
        });

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Product updated successfully in both inventories!"
        )
      );
    });

    // FIX 3: Same adminProducts fix as above — ensures modal closes after update.
    it("closes modal after a successful update", async () => {
      updateDoc.mockResolvedValue();
      getDoc.mockResolvedValue(mockSupplierDoc);
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({
          // adminProducts lookup — return a matching doc so adminDoc.id is defined
          docs: [{ id: "admin-prod-1", data: () => ({ ...approvedProduct1 }) }],
        });

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(screen.queryByTestId("product-modal")).not.toBeInTheDocument()
      );
    });
  });

  // ── 8. Delete Product ────────────────────────────────────────────────────────

  describe("Delete Product", () => {
    it("calls window.confirm before deleting", async () => {
      setupDefaultMocks();
      deleteDoc.mockResolvedValue();
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({ docs: [] }); // adminProducts lookup

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("delete-btn-prod-1"));

      fireEvent.click(screen.getByTestId("delete-btn-prod-1"));

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("Are you sure you want to delete")
      );
    });

    it("calls deleteDoc when confirm returns true", async () => {
      deleteDoc.mockResolvedValue();
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({ docs: [] })   // adminProducts lookup
        .mockResolvedValueOnce({ docs: [] });   // re-fetch after delete

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("delete-btn-prod-1"));

      fireEvent.click(screen.getByTestId("delete-btn-prod-1"));

      await waitFor(() =>
        expect(deleteDoc).toHaveBeenCalled()
      );
    });

    // FIX 4: Use mockResolvedValue (not Once) so every getDocs call returns the
    // product — avoids the mock being consumed by an earlier internal call on
    // mount before the products fetch, which caused Approved (0) in the DOM.
    // window.confirm is set to false so deleteDoc must never be called.
    it("does NOT call deleteDoc when confirm returns false", async () => {
      window.confirm = vi.fn(() => false);
      getDoc.mockResolvedValue(mockSupplierDoc);
      getDocs.mockResolvedValue({
        docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
      });
      onSnapshot.mockImplementation((q, cb) => {
        cb({ docs: [pendingProduct1].map((p) => ({ id: p.id, data: () => p })) });
        return vi.fn();
      });
      deleteDoc.mockResolvedValue();

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("delete-btn-prod-1"));

      fireEvent.click(screen.getByTestId("delete-btn-prod-1"));

      expect(deleteDoc).not.toHaveBeenCalled();
    });

    // FIX 5: Mock adminProducts getDocs to return a matching document so that
    // the production code can read adminDoc.id without throwing on delete.
    it("shows success alert after deleting a product", async () => {
      deleteDoc.mockResolvedValue();
      getDoc.mockResolvedValue(mockSupplierDoc);
      getDocs
        .mockResolvedValueOnce({
          docs: [approvedProduct1].map((p) => ({ id: p.id, data: () => p })),
        })
        .mockResolvedValueOnce({
          // adminProducts lookup — return a matching doc so adminDoc.id is defined
          docs: [{ id: "admin-prod-1", data: () => ({ ...approvedProduct1 }) }],
        })
        .mockResolvedValueOnce({ docs: [] }); // re-fetch after delete

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("delete-btn-prod-1"));

      fireEvent.click(screen.getByTestId("delete-btn-prod-1"));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          "Product deleted successfully from both inventories!"
        )
      );
    });
  });

  // ── 9. Form Reset ────────────────────────────────────────────────────────────

  describe("Form Reset", () => {
    it("resets form fields after closing the modal", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"), {
        target: { value: "Test Drug" },
      });
      fireEvent.click(screen.getByTestId("modal-close-btn"));

      // Reopen modal — fields should be empty
      fireEvent.click(screen.getByTestId("add-product-btn"));
      expect(screen.getByTestId("input-productName")).toHaveValue("");
    });

    it("resets form when switching from edit to add", async () => {
      setupDefaultMocks();
      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("edit-btn-prod-1"));

      // Open edit modal (pre-fills Paracetamol)
      fireEvent.click(screen.getByTestId("edit-btn-prod-1"));
      expect(screen.getByTestId("input-productName")).toHaveValue("Paracetamol");

      // Close and open fresh Add modal
      fireEvent.click(screen.getByTestId("modal-close-btn"));
      fireEvent.click(screen.getByTestId("add-product-btn"));

      expect(screen.getByTestId("input-productName")).toHaveValue("");
      expect(screen.getByTestId("modal-title")).toHaveTextContent("Add Product");
    });
  });

  // ── 10. Edge Cases ───────────────────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("handles getDocs error without crashing", async () => {
      getDoc.mockResolvedValue(mockSupplierDoc);
      getDocs.mockRejectedValue(new Error("Firestore unavailable"));
      onSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return vi.fn(); });

      render(<ProductCatalog />);
      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load products")
        )
      );
    });

    it("renders empty approved table when no products exist", async () => {
      setupDefaultMocks({ approved: [] });
      render(<ProductCatalog />);
      await waitFor(() =>
        expect(screen.getByTestId("product-table-empty")).toBeInTheDocument()
      );
    });

    it("renders empty pending table when no pending products exist", async () => {
      setupDefaultMocks({ pending: [] });
      render(<ProductCatalog />);
      fireEvent.click(await screen.findByTestId("tab-pending"));
      await waitFor(() =>
        expect(screen.getByTestId("pending-table-empty")).toBeInTheDocument()
      );
    });

    it("shows login alert if currentUser is null when submitting add form", async () => {
      // Simulate no auth user
      const { getAuth } = await import("firebase/auth");
      getAuth.mockReturnValueOnce({
        currentUser: null,
        onAuthStateChanged: vi.fn((cb) => { cb(null); return vi.fn(); }),
      });

      getDocs.mockResolvedValue({ docs: [] });
      onSnapshot.mockImplementation((q, cb) => { cb({ docs: [] }); return vi.fn(); });

      render(<ProductCatalog />);
      await waitFor(() => screen.getByTestId("add-product-btn"));

      fireEvent.click(screen.getByTestId("add-product-btn"));
      fireEvent.change(screen.getByTestId("input-productName"),    { target: { value: "Drug X" } });
      fireEvent.change(screen.getByTestId("input-category"),       { target: { value: "Medicine" } });
      fireEvent.change(screen.getByTestId("input-wholesalePrice"), { target: { value: "10" } });
      fireEvent.click(screen.getByTestId("modal-submit-btn"));

      await waitFor(() =>
        expect(window.alert).toHaveBeenCalledWith("Please login to add products")
      );
    });
  });
});