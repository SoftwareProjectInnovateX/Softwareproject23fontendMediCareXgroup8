import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { getDocs, updateDoc, getDoc, addDoc, doc } from "firebase/firestore";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OrderManagement from "./OrderManagement";

/* ================= MOCKS ================= */

vi.mock("firebase/firestore", () => ({
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  query:       vi.fn(),
  orderBy:     vi.fn(),
  updateDoc:   vi.fn(),
  doc:         vi.fn(() => ({ id: "mocked-doc-ref" })),   // must return a truthy value
  Timestamp:   { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })), fromDate: vi.fn() },
  getDoc:      vi.fn(),
  addDoc:      vi.fn(),
  where:       vi.fn(),
}));

vi.mock("../../services/firebase", () => ({
  db: {},
}));

vi.mock("../../components/Card", () => ({
  default: function MockCard({ title, value }) {
    return (
      <div data-testid="stat-card">
        <span>{title}</span>
        <span>{value}</span>
      </div>
    );
  },
}));

vi.mock("../../components/admin/OrderFilters", () => ({
  OrderFilters: function MockOrderFilters({ searchTerm, onSearch, statusFilter, onStatusFilter }) {
    return (
      <div data-testid="order-filters">
        <input
          data-testid="search-input"
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search orders"
        />
        <select
          data-testid="status-select"
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>
    );
  },
}));

vi.mock("../../components/admin/OrderTable", () => ({
  OrderTable: function MockOrderTable({ loading, orders, onView }) {
    if (loading) return <div data-testid="loading-indicator">Loading...</div>;
    if (!orders.length) return <div data-testid="empty-state">No orders found</div>;
    return (
      <table>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} data-testid="order-row">
              <td>{order.poId || order.id}</td>
              <td>{order.productName || order.product || "N/A"}</td>
              <td>{order.status}</td>
              <td>
                <button data-testid={`view-btn-${order.id}`} onClick={() => onView(order)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

vi.mock("../../components/admin/OrderModal", () => ({
  OrderModal: function MockOrderModal({ order, onClose, onMarkReceived }) {
    return (
      <div data-testid="order-modal">
        <span data-testid="modal-po-id">{order.poId || order.id}</span>
        <span data-testid="modal-status">{order.status}</span>
        <button data-testid="close-modal-btn" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="mark-received-btn"
          onClick={() => onMarkReceived(order.id, order)}
        >
          Mark as Received
        </button>
      </div>
    );
  },
}));

/* ================= TEST DATA ================= */

const mockOrders = [
  {
    id: "ord1",
    poId: "PO-001",
    productName: "Paracetamol",
    supplierName: "MedSupply Co",
    status: "PENDING",
    quantity: 100,
    unitPrice: 50,
    createdAt: { seconds: 1700000000 },
  },
  {
    id: "ord2",
    poId: "PO-002",
    productName: "Amoxicillin",
    supplierName: "PharmaDist",
    status: "APPROVED",
    quantity: 200,
    unitPrice: 75,
    createdAt: { seconds: 1700100000 },
  },
  {
    id: "ord3",
    poId: "PO-003",
    productName: "Ibuprofen",
    supplierName: "MedSupply Co",
    status: "DELIVERED",
    quantity: 50,
    unitPrice: 120,
    adminProductId: "prod3",
    createdAt: { seconds: 1700200000 },
  },
  {
    id: "ord4",
    poId: "PO-004",
    productName: "Vitamin C",
    supplierName: "NutriPharm",
    status: "COMPLETED",
    quantity: 300,
    unitPrice: 30,
    createdAt: { seconds: 1700300000 },
  },
];

const makeSnap = (orders) => ({
  docs: orders.map((o) => ({ id: o.id, data: () => o })),
});

const setupMocks = (orders = mockOrders) => {
  getDocs.mockResolvedValue(makeSnap(orders));
};

/* ================= TESTS ================= */

describe("OrderManagement", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  /* ── Page Structure ── */
  describe("Page Structure", () => {
    beforeEach(() => setupMocks());

    it("renders page heading", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText("Purchase Orders")).toBeInTheDocument()
      );
    });

    it("renders page subtitle", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText("Manage and track all purchase orders")).toBeInTheDocument()
      );
    });

    it("renders the search and filter bar", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByTestId("order-filters")).toBeInTheDocument()
      );
    });
  });

  /* ── Summary Stat Cards ── */
  describe("Summary Stat Cards", () => {
    beforeEach(() => setupMocks());

    it("renders exactly 6 stat cards", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getAllByTestId("stat-card")).toHaveLength(6)
      );
    });

    it("displays Total Orders card with correct count", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const totalCard = cards.find((c) => within(c).queryByText("Total Orders"));
        expect(totalCard).toBeDefined();
        expect(within(totalCard).getByText("4")).toBeInTheDocument();
      });
    });

    it("displays Pending card with correct count", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const pendingCard = cards.find((c) => within(c).queryByText("Pending"));
        expect(pendingCard).toBeDefined();
        expect(within(pendingCard).getByText("1")).toBeInTheDocument();
      });
    });

    it("displays Approved card with correct count", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const approvedCard = cards.find((c) => within(c).queryByText("Approved"));
        expect(approvedCard).toBeDefined();
        expect(within(approvedCard).getByText("1")).toBeInTheDocument();
      });
    });

    it("displays Delivered card with correct count", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const deliveredCard = cards.find((c) => within(c).queryByText("Delivered"));
        expect(deliveredCard).toBeDefined();
        expect(within(deliveredCard).getByText("1")).toBeInTheDocument();
      });
    });

    it("displays Completed card with correct count", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const completedCard = cards.find((c) => within(c).queryByText("Completed"));
        expect(completedCard).toBeDefined();
        expect(within(completedCard).getByText("1")).toBeInTheDocument();
      });
    });

    it("displays Total Amount card with correct calculated value", async () => {
      render(<OrderManagement />);
      // (100×50) + (200×75) + (50×120) + (300×30) = 5000+15000+6000+9000 = 35000
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const amountCard = cards.find((c) => within(c).queryByText("Total Amount"));
        expect(amountCard).toBeDefined();
        expect(within(amountCard).getByText("Rs. 35000.00")).toBeInTheDocument();
      });
    });
  });

  /* ── Delivered Alert Banner ── */
  describe("Delivered Alert Banner", () => {
    it("shows the delivered alert when at least one order is DELIVERED", async () => {
      setupMocks();
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText(/order\(s\) delivered by supplier/i)).toBeInTheDocument()
      );
    });

    it("does not show the alert when no orders are DELIVERED", async () => {
      setupMocks(mockOrders.filter((o) => o.status !== "DELIVERED"));
      render(<OrderManagement />);
      await waitFor(() =>
        expect(
          screen.queryByText(/order\(s\) delivered by supplier/i)
        ).not.toBeInTheDocument()
      );
    });

    it("shows correct count in the delivered alert", async () => {
      setupMocks();
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText(/1 order\(s\) delivered by supplier/i)).toBeInTheDocument()
      );
    });
  });

  /* ── Orders Table ── */
  describe("Orders Table", () => {
    beforeEach(() => setupMocks());

    it("renders a row for each order", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getAllByTestId("order-row")).toHaveLength(4)
      );
    });

    it("renders all order PO IDs", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        expect(screen.getByText("PO-001")).toBeInTheDocument();
        expect(screen.getByText("PO-002")).toBeInTheDocument();
        expect(screen.getByText("PO-003")).toBeInTheDocument();
        expect(screen.getByText("PO-004")).toBeInTheDocument();
      });
    });

    it("renders all order product names", async () => {
      render(<OrderManagement />);
      await waitFor(() => {
        expect(screen.getByText("Paracetamol")).toBeInTheDocument();
        expect(screen.getByText("Amoxicillin")).toBeInTheDocument();
        expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
        expect(screen.getByText("Vitamin C")).toBeInTheDocument();
      });
    });

    it("shows loading indicator while fetching", () => {
      getDocs.mockReturnValue(new Promise(() => {}));
      render(<OrderManagement />);
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });

  /* ── Search Filtering ── */
  describe("Search Filtering", () => {
    beforeEach(() => setupMocks());

    it("filters orders by product name search term", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "Paracetamol" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-001")).toBeInTheDocument();
      });
    });

    it("filters orders by PO ID search term", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "PO-003" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-003")).toBeInTheDocument();
      });
    });

    it("shows empty state when no orders match the search", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "nonexistent-product-xyz" },
      });

      await waitFor(() =>
        expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      );
    });

    it("search is case-insensitive", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("search-input"), {
        target: { value: "paracetamol" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-001")).toBeInTheDocument();
      });
    });
  });

  /* ── Status Filtering ── */
  describe("Status Filtering", () => {
    beforeEach(() => setupMocks());

    it("shows all orders when filter is 'All'", async () => {
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getAllByTestId("order-row")).toHaveLength(4)
      );
    });

    it("filters to only PENDING orders", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("status-select"), {
        target: { value: "PENDING" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-001")).toBeInTheDocument();
      });
    });

    it("filters to only APPROVED orders", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("status-select"), {
        target: { value: "APPROVED" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-002")).toBeInTheDocument();
      });
    });

    it("filters to only COMPLETED orders", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.change(screen.getByTestId("status-select"), {
        target: { value: "COMPLETED" },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("order-row")).toHaveLength(1);
        expect(screen.getByText("PO-004")).toBeInTheDocument();
      });
    });

    it("shows empty state when no orders match the status filter", async () => {
      setupMocks(mockOrders.filter((o) => o.status !== "CANCELLED"));
      render(<OrderManagement />);

      fireEvent.change(screen.getByTestId("status-select"), {
        target: { value: "CANCELLED" },
      });

      await waitFor(() =>
        expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      );
    });
  });

  /* ── Order Details Modal ── */
  describe("Order Details Modal", () => {
    beforeEach(() => setupMocks());

    it("opens the modal when View button is clicked", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord1"));

      await waitFor(() =>
        expect(screen.getByTestId("order-modal")).toBeInTheDocument()
      );
    });

    it("displays the correct order in the modal", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord1"));

      await waitFor(() => {
        expect(screen.getByTestId("modal-po-id")).toHaveTextContent("PO-001");
        expect(screen.getByTestId("modal-status")).toHaveTextContent("PENDING");
      });
    });

    it("closes the modal when Close button is clicked", async () => {
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord1"));
      await waitFor(() => expect(screen.getByTestId("order-modal")).toBeInTheDocument());

      fireEvent.click(screen.getByTestId("close-modal-btn"));

      await waitFor(() =>
        expect(screen.queryByTestId("order-modal")).not.toBeInTheDocument()
      );
    });
  });

  /* ── Mark as Received ── */
  describe("Mark as Received", () => {
    // Wire up all getDocs calls needed for the full markAsReceived flow:
    // Call 1: initial fetchOrders on mount
    // Call 2: payments query (where purchaseOrderId == orderId, paymentType == FINAL)
    // Call 3: invoices query (where purchaseOrderId == orderId, invoiceType == FINAL)
    // Call 4: fetchOrders called again after markAsReceived completes
    const setupMarkReceivedMocks = () => {
      getDocs
        .mockResolvedValueOnce(makeSnap(mockOrders))  // 1. initial fetch
        .mockResolvedValueOnce({ docs: [], empty: true })  // 2. payments query → empty → addDoc
        .mockResolvedValueOnce({ docs: [], empty: true })  // 3. invoices query → empty → addDoc
        .mockResolvedValueOnce(makeSnap(mockOrders));      // 4. re-fetch after completion

      updateDoc.mockResolvedValue();
      addDoc.mockResolvedValue({ id: "new-doc-id" });
      getDoc.mockResolvedValue({
        exists: () => true,
        data:   () => ({ stock: 10 }),
      });
    };

    it("calls window.confirm before marking as received", async () => {
      setupMarkReceivedMocks();
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord3"));
      await waitFor(() => expect(screen.getByTestId("order-modal")).toBeInTheDocument());

      fireEvent.click(screen.getByTestId("mark-received-btn"));

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("Mark this order as COMPLETED")
      );
    });

    it("calls updateDoc to set status to COMPLETED", async () => {
      setupMarkReceivedMocks();
      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord3"));
      await waitFor(() => expect(screen.getByTestId("order-modal")).toBeInTheDocument());

      fireEvent.click(screen.getByTestId("mark-received-btn"));

      await waitFor(() =>
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ id: "mocked-doc-ref" }),
          expect.objectContaining({ status: "COMPLETED" })
        )
      );
    });

    it("does not proceed when user cancels the confirm dialog", async () => {
      setupMarkReceivedMocks();
      window.confirm.mockReturnValue(false);

      render(<OrderManagement />);
      await waitFor(() => expect(screen.getAllByTestId("order-row")).toHaveLength(4));

      fireEvent.click(screen.getByTestId("view-btn-ord3"));
      await waitFor(() => expect(screen.getByTestId("order-modal")).toBeInTheDocument());

      fireEvent.click(screen.getByTestId("mark-received-btn"));

      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  /* ── Empty States ── */
  describe("Empty States", () => {
    it("shows empty state when orders collection is empty", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      );
    });

    it("shows zero counts on all stat cards when no orders exist", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const totalCard = cards.find((c) => within(c).queryByText("Total Orders"));
        expect(within(totalCard).getByText("0")).toBeInTheDocument();
      });
    });

    it("shows Rs. 0.00 total amount when no orders exist", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const amountCard = cards.find((c) => within(c).queryByText("Total Amount"));
        expect(within(amountCard).getByText("Rs. 0.00")).toBeInTheDocument();
      });
    });

    it("does not show delivered alert when no orders exist", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<OrderManagement />);
      await waitFor(() =>
        expect(
          screen.queryByText(/order\(s\) delivered by supplier/i)
        ).not.toBeInTheDocument()
      );
    });
  });

  /* ── Edge Cases ── */
  describe("Edge Cases", () => {
    it("handles orders with missing quantity and unitPrice gracefully", async () => {
      setupMocks([{ id: "e1", poId: "PO-E1", status: "PENDING" }]);
      render(<OrderManagement />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const amountCard = cards.find((c) => within(c).queryByText("Total Amount"));
        expect(within(amountCard).getByText("Rs. 0.00")).toBeInTheDocument();
      });
    });

    it("falls back to order.id when poId is missing", async () => {
      setupMocks([
        { id: "fallback-id", productName: "Widget", status: "PENDING", quantity: 1, unitPrice: 10 },
      ]);
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText("fallback-id")).toBeInTheDocument()
      );
    });

    it("falls back to order.product when productName is missing", async () => {
      setupMocks([
        { id: "e2", poId: "PO-E2", product: "Fallback Product", status: "PENDING", quantity: 1, unitPrice: 10 },
      ]);
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText("Fallback Product")).toBeInTheDocument()
      );
    });

    it("shows N/A when both productName and product are missing", async () => {
      setupMocks([
        { id: "e3", poId: "PO-E3", status: "PENDING", quantity: 1, unitPrice: 10 },
      ]);
      render(<OrderManagement />);
      await waitFor(() =>
        expect(screen.getByText("N/A")).toBeInTheDocument()
      );
    });
  });

  /* ── Firestore Data Fetching ── */
  describe("Firestore Data Fetching", () => {
    it("calls getDocs exactly once on mount", async () => {
      setupMocks();
      render(<OrderManagement />);
      await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(1));
    });
  });
});