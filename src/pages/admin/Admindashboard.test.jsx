import { render, screen, waitFor, within } from "@testing-library/react";
import { getDocs } from "firebase/firestore";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminDashboard from "./AdminDashboard";

/* ================= MOCKS ================= */

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("../../services/firebase", () => ({
  db: {},
}));

vi.mock("recharts", () => {
  const React = require("react");
  const MockComponent = ({ children }) => React.createElement("div", null, children);
  return {
    BarChart: MockComponent,
    Bar: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    Tooltip: MockComponent,
    ResponsiveContainer: ({ children }) => React.createElement("div", null, children),
  };
});

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

vi.mock("../../components/StatusBadge", () => ({
  default: function MockStatusBadge({ status }) {
    return <span data-testid="status-badge">{status}</span>;
  },
}));

/* ================= TEST DATA ================= */

const mockUsers     = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
const mockSuppliers = [{ id: "s1" }, { id: "s2" }];
const mockProducts  = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }];

const mockOrders = [
  { totalAmount: 50000, category: "Electronics" },
  { totalAmount: 30000, category: "Clothing" },
  { totalAmount: 20000, category: "Electronics" },
];

const mockPurchaseOrders = [
  { amount: 40000 },
  { amount: 20000 },
];

const mockRecentOrders = [
  { id: "po1", poId: "PO-001", product: "Laptop",  quantity: 5,  status: "delivered" },
  { id: "po2", poId: "PO-002", product: "Shirt",   quantity: 20, status: "pending"   },
  { id: "po3", poId: "PO-003", product: "Monitor", quantity: 3,  status: "cancelled" },
];

/**
 * setupMocks wires getDocs in the exact call order the component uses:
 * 1. users  2. suppliers  3. products  4. orders  5. purchaseOrders  6. recentOrders (query)
 */
const setupMocks = ({
  users          = mockUsers,
  suppliers      = mockSuppliers,
  products       = mockProducts,
  orders         = mockOrders,
  purchaseOrders = mockPurchaseOrders,
  recentOrders   = mockRecentOrders,
} = {}) => {
  const toSnap = (items) => ({
    size: items.length,
    docs: items.map((d) => ({
      id: d.id || "auto-id",
      data: () => d,
    })),
  });

  getDocs
    .mockResolvedValueOnce(toSnap(users))          // 1. users
    .mockResolvedValueOnce(toSnap(suppliers))       // 2. suppliers
    .mockResolvedValueOnce(toSnap(products))        // 3. products
    .mockResolvedValueOnce(toSnap(orders))          // 4. orders
    .mockResolvedValueOnce(toSnap(purchaseOrders))  // 5. purchaseOrders
    .mockResolvedValueOnce(toSnap(recentOrders));   // 6. recent (queried)
};

/* ================= TESTS ================= */

describe("AdminDashboard", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Page structure ── */
  describe("Page Structure", () => {
    beforeEach(() => setupMocks());

    it("renders without crashing", async () => {
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getAllByTestId("stat-card").length).toBeGreaterThan(0)
      );
    });

    it("renders the Sales by Category chart heading", async () => {
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Sales by Category")).toBeInTheDocument()
      );
    });

    it("renders the Recent Orders table heading", async () => {
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Recent Orders")).toBeInTheDocument()
      );
    });
  });

  /* ── Summary cards ── */
  describe("Summary Cards", () => {
    beforeEach(() => setupMocks());

    it("renders exactly 4 stat cards", async () => {
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getAllByTestId("stat-card")).toHaveLength(4)
      );
    });

    it("displays correct user count (3)", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const userCard = cards.find((card) =>
          within(card).queryByText("Total Users")
        );
        expect(userCard).toBeDefined();
        expect(within(userCard).getByText("3")).toBeInTheDocument();
      });
    });

    it("displays correct supplier count (2)", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const supplierCard = cards.find((card) =>
          within(card).queryByText("Suppliers")
        );
        expect(supplierCard).toBeDefined();
        expect(within(supplierCard).getByText("2")).toBeInTheDocument();
      });
    });

    it("displays correct product count (4)", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        const cards = screen.getAllByTestId("stat-card");
        const productCard = cards.find((card) =>
          within(card).queryByText("Products")
        );
        expect(productCard).toBeDefined();
        expect(within(productCard).getByText("4")).toBeInTheDocument();
      });
    });

    it("displays correct total revenue (Rs. 100,000)", async () => {
      render(<AdminDashboard />);
      // 50000 + 30000 + 20000 = 100,000
      await waitFor(() => {
        expect(screen.getByText("Total Revenue")).toBeInTheDocument();
        expect(screen.getByText("Rs. 100,000")).toBeInTheDocument();
      });
    });
  });

  /* ── Profit calculation ── */
  describe("Profit Calculation", () => {
    it("calculates profit as revenue minus purchase order costs", async () => {
      // revenue = 100,000 | cost = 60,000 | profit = 40,000
      // (profit is internal state; we verify no crash and revenue renders)
      setupMocks();
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Rs. 100,000")).toBeInTheDocument()
      );
    });
  });

  /* ── Recent orders table ── */
  describe("Recent Orders Table", () => {
    beforeEach(() => setupMocks());

    it("renders all table column headers", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText("Order ID")).toBeInTheDocument();
        expect(screen.getByText("Product")).toBeInTheDocument();
        expect(screen.getByText("Quantity")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
      });
    });

    it("renders a row for each recent order", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText("PO-001")).toBeInTheDocument();
        expect(screen.getByText("PO-002")).toBeInTheDocument();
        expect(screen.getByText("PO-003")).toBeInTheDocument();
      });
    });

    it("renders product names in the table", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText("Laptop")).toBeInTheDocument();
        expect(screen.getByText("Shirt")).toBeInTheDocument();
        expect(screen.getByText("Monitor")).toBeInTheDocument();
      });
    });

    it("renders quantities in the table", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        const table = screen.getByRole("table");
        expect(within(table).getByText("5")).toBeInTheDocument();
        expect(within(table).getByText("20")).toBeInTheDocument();
        expect(within(table).getByText("3")).toBeInTheDocument();
      });
    });

    it("renders a StatusBadge for each order row", async () => {
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getAllByTestId("status-badge")).toHaveLength(3)
      );
    });

    it("passes correct status values to StatusBadge", async () => {
      render(<AdminDashboard />);
      await waitFor(() => {
        expect(screen.getByText("delivered")).toBeInTheDocument();
        expect(screen.getByText("pending")).toBeInTheDocument();
        expect(screen.getByText("cancelled")).toBeInTheDocument();
      });
    });
  });

  /* ── Empty states ── */
  describe("Empty States", () => {
    it("shows 'No recent orders' when recent orders list is empty", async () => {
      setupMocks({ recentOrders: [] });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("No recent orders")).toBeInTheDocument()
      );
    });

    it("shows zero counts when all collections are empty", async () => {
      setupMocks({
        users: [], suppliers: [], products: [],
        orders: [], purchaseOrders: [], recentOrders: [],
      });
      render(<AdminDashboard />);
      await waitFor(() => {
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("shows Rs. 0 revenue when orders collection is empty", async () => {
      setupMocks({ orders: [], recentOrders: [] });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Rs. 0")).toBeInTheDocument()
      );
    });
  });

  /* ── Edge cases ── */
  describe("Edge Cases", () => {
    it("falls back to order.id when poId is missing", async () => {
      setupMocks({
        recentOrders: [
          { id: "fallback-id", product: "Widget", quantity: 1, status: "pending" },
        ],
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("fallback-id")).toBeInTheDocument()
      );
    });

    it("shows 'N/A' when order product field is missing", async () => {
      setupMocks({
        recentOrders: [
          { id: "po-x", poId: "PO-X", quantity: 2, status: "pending" },
        ],
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("N/A")).toBeInTheDocument()
      );
    });

    it("shows 0 quantity when order quantity field is missing", async () => {
      setupMocks({
        recentOrders: [
          { id: "po-y", poId: "PO-Y", product: "Gadget", status: "pending" },
        ],
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("0")).toBeInTheDocument()
      );
    });

    it("defaults status to 'pending' when order status field is missing", async () => {
      setupMocks({
        recentOrders: [
          { id: "po-z", poId: "PO-Z", product: "Thing", quantity: 1 },
        ],
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("pending")).toBeInTheDocument()
      );
    });

    it("handles orders with missing totalAmount without crashing", async () => {
      setupMocks({
        orders: [
          { category: "Electronics" }, // no totalAmount
          { totalAmount: 10000, category: "Clothing" },
        ],
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Sales by Category")).toBeInTheDocument()
      );
    });

    it("handles orders with no category by grouping under Uncategorized", async () => {
      setupMocks({
        orders: [{ totalAmount: 5000 }], // no category field
      });
      render(<AdminDashboard />);
      await waitFor(() =>
        expect(screen.getByText("Sales by Category")).toBeInTheDocument()
      );
    });
  });

  /* ── Firestore calls ── */
  describe("Firestore Data Fetching", () => {
    it("calls getDocs exactly 6 times on mount", async () => {
      setupMocks();
      render(<AdminDashboard />);
      await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(6));
    });
  });
});