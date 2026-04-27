import { render, screen, waitFor, within } from "@testing-library/react";
import { getDocs } from "firebase/firestore";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FinancialAnalytics from "./FinancialAnalytics";

/* ================= MOCKS ================= */

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
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
    PieChart: MockComponent,
    Pie: MockComponent,
    Cell: MockComponent,
    Legend: MockComponent,
    CartesianGrid: MockComponent,
  };
});

vi.mock("../../components/Card", () => ({
  default: function MockCard({ title, value }) {
    return (
      <div data-testid="summary-card">
        <span>{title}</span>
        <span>{value}</span>
      </div>
    );
  },
}));

/* ================= TEST DATA ================= */

const mockPurchaseOrders = [
  { amount: 50000, category: "Electronics", createdAt: new Date("2024-01-15") },
  { amount: 30000, category: "Clothing",    createdAt: new Date("2024-02-10") },
  { amount: 20000, category: "Electronics", createdAt: new Date("2024-03-05") },
];

const mockCustomerOrders = [
  {
    totalAmount: 80000,
    createdAt: new Date("2024-01-20"),
    types: [
      { name: "Laptop",  price: 60000, quantity: 1, category: "Electronics" },
      { name: "Charger", price: 5000,  quantity: 4, category: "Electronics" },
    ],
  },
  {
    totalAmount: 45000,
    createdAt: new Date("2024-02-14"),
    types: [
      { name: "Shirt", price: 1500, quantity: 10, category: "Clothing" },
      { name: "Pants", price: 3000, quantity: 10, category: "Clothing" },
    ],
  },
];

const mockOrders = [
  { category: "Electronics", totalAmount: 10000 },
  { category: "Clothing",    totalAmount: 5000  },
];

/* ================= TESTS ================= */

describe("FinancialAnalytics", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Loading state ── */
  describe("Loading State", () => {
    it("renders a loading spinner before data resolves", () => {
      getDocs.mockReturnValue(new Promise(() => {}));
      render(<FinancialAnalytics />);
      expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    });
  });

  /* ── Page structure ── */
  describe("Page Structure", () => {
    beforeEach(() => {
      getDocs
        .mockResolvedValueOnce({ docs: mockOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockPurchaseOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockCustomerOrders.map((d) => ({ data: () => d })) });
    });

    it("renders the page heading after data loads", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });

    it("renders the page subtitle", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText(/track costs, revenue, and profit margins/i)).toBeInTheDocument()
      );
    });
  });

  /* ── Summary cards ── */
  describe("Summary Cards", () => {
    beforeEach(() => {
      getDocs
        .mockResolvedValueOnce({ docs: mockOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockPurchaseOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockCustomerOrders.map((d) => ({ data: () => d })) });
    });

    it("renders four summary cards", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getAllByTestId("summary-card")).toHaveLength(4)
      );
    });

    it("displays Total Cost card", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Total Cost")).toBeInTheDocument());
    });

    it("displays Total Revenue card", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Total Revenue")).toBeInTheDocument());
    });

    it("displays Net Profit card", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Net Profit")).toBeInTheDocument());
    });

    it("displays Profit Margin card", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Profit Margin")).toBeInTheDocument());
    });

    it("calculates correct total cost", async () => {
      render(<FinancialAnalytics />);
      // 50000 + 30000 + 20000 = 100,000
      await waitFor(() => expect(screen.getByText("Rs. 100,000")).toBeInTheDocument());
    });

    it("calculates correct total revenue", async () => {
      render(<FinancialAnalytics />);
      // 80000 + 45000 = 125,000
      await waitFor(() => expect(screen.getByText("Rs. 125,000")).toBeInTheDocument());
    });

    it("calculates correct net profit", async () => {
      render(<FinancialAnalytics />);
      // 125000 - 100000 = 25,000
      await waitFor(() => expect(screen.getByText("Rs. 25,000")).toBeInTheDocument());
    });

    it("calculates correct profit margin percentage", async () => {
      render(<FinancialAnalytics />);
      // (25000 / 125000) * 100 = 20.0%
      await waitFor(() => {
        const cards = screen.getAllByTestId("summary-card");
        const marginCard = cards.find((card) =>
          within(card).queryByText("Profit Margin")
        );
        expect(marginCard).toBeDefined();
        expect(within(marginCard).getByText("20.0%")).toBeInTheDocument();
      });
    });
  });

  /* ── Chart section headers ── */
  describe("Chart Section Headers", () => {
    beforeEach(() => {
      getDocs
        .mockResolvedValueOnce({ docs: mockOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockPurchaseOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockCustomerOrders.map((d) => ({ data: () => d })) });
    });

    it("renders Revenue vs Cost Trend chart title", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Revenue vs Cost Trend")).toBeInTheDocument()
      );
    });

    it("renders Profit by Category chart title", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Profit by Category")).toBeInTheDocument()
      );
    });

    it("renders Monthly badge label", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Monthly")).toBeInTheDocument());
    });
  });

  /* ── Category breakdown table ── */
  describe("Category Breakdown Table", () => {
    beforeEach(() => {
      getDocs
        .mockResolvedValueOnce({ docs: mockOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockPurchaseOrders.map((d) => ({ data: () => d })) })
        .mockResolvedValueOnce({ docs: mockCustomerOrders.map((d) => ({ data: () => d })) });
    });

    it("renders table section heading", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Category Breakdown")).toBeInTheDocument()
      );
    });

    it("renders all table column headers", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => {
        expect(screen.getByText("Category")).toBeInTheDocument();
        expect(screen.getAllByText("Total Cost").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Total Revenue").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Net Profit").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Margin")).toBeInTheDocument();
      });
    });

    it("renders a row for each unique category", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => {
        expect(screen.getAllByText("Electronics").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Clothing").length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders the table footer totals row", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() => expect(screen.getByText("Total")).toBeInTheDocument());
    });

    it("shows category count badge", async () => {
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText(/categories/i)).toBeInTheDocument()
      );
    });
  });

  /* ── Edge cases ── */
  describe("Edge Cases", () => {
    it("handles completely empty collections without crashing", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });

    it("shows Rs. 0 totals when all collections are empty", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<FinancialAnalytics />);
      await waitFor(() => {
        const zeroCards = screen.getAllByText("Rs. 0");
        expect(zeroCards.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("shows 0% profit margin when revenue is zero", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<FinancialAnalytics />);
      await waitFor(() => {
        // "0%" appears in both the Profit Margin summary card and the table footer
        // Use the summary card scoped query to be precise
        const cards = screen.getAllByTestId("summary-card");
        const marginCard = cards.find((card) =>
          within(card).queryByText("Profit Margin")
        );
        expect(marginCard).toBeDefined();
        expect(within(marginCard).getByText("0%")).toBeInTheDocument();
      });
    });

    it("handles missing createdAt fields gracefully", async () => {
      getDocs
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ category: "Tools", totalAmount: 5000 }) }],
        })
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ amount: 2000 }) }],
        })
        .mockResolvedValueOnce({ docs: [] });

      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });

    it("handles Firestore Timestamp format for createdAt", async () => {
      const firestoreTimestamp = { toDate: () => new Date("2024-06-15") };
      getDocs
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({
          docs: [
            {
              data: () => ({
                amount: 10000,
                category: "Books",
                createdAt: firestoreTimestamp,
              }),
            },
          ],
        })
        .mockResolvedValueOnce({ docs: [] });

      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });

    it("handles customerOrders with no types array", async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({
          docs: [
            {
              data: () => ({
                totalAmount: 5000,
                createdAt: new Date("2024-03-01"),
              }),
            },
          ],
        });

      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });

    it("handles negative profit without crashing", async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ amount: 999999, category: "X", createdAt: new Date() }) }],
        })
        .mockResolvedValueOnce({
          docs: [{ data: () => ({ totalAmount: 1, createdAt: new Date(), types: [] }) }],
        });

      render(<FinancialAnalytics />);
      await waitFor(() =>
        expect(screen.getByText("Financial Analytics")).toBeInTheDocument()
      );
    });
  });

  /* ── Firestore integration ── */
  describe("Firestore Data Fetching", () => {
    it("calls getDocs exactly 3 times", async () => {
      getDocs.mockResolvedValue({ docs: [] });
      render(<FinancialAnalytics />);
      await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(3));
    });
  });
});