import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AdminPayments from "./AdminPayments";

// ─── Mock Firebase ────────────────────────────────────────────────────────────

vi.mock("../../services/firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  updateDoc:   vi.fn(),
  addDoc:      vi.fn(),
  doc:         vi.fn(),
  query:       vi.fn(),
  orderBy:     vi.fn(),
  where:       vi.fn(),
  Timestamp:   { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

// Mock the Card component
vi.mock("../../components/Card", () => ({
  default: ({ title, value }) => <div data-testid="card">{title}: {value}</div>,
}));

import { getDocs, updateDoc, addDoc } from "firebase/firestore";

// ─── Sample Data ──────────────────────────────────────────────────────────────

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 10); // 10 days from now

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5); // 5 days ago (overdue)

const makeTimestamp = (date) => ({
  toDate: () => date,
  toMillis: () => date.getTime(),
});

// A normal PENDING payment (not overdue)
const pendingPayment = {
  id: "pay-1",
  orderId: "PO-001",
  supplierName: "ABC Suppliers",
  productName: "Paracetamol",
  paymentType: "INITIAL",
  paymentLabel: "Initial 50%",
  quantity: 100,
  amount: 5000,
  totalOrderAmount: 10000,
  dueDate: makeTimestamp(futureDate),
  createdAt: makeTimestamp(new Date()),
  status: "PENDING",
  supplierId: "sup-1",
  purchaseOrderId: "po-doc-1",
};

// An OVERDUE payment (due date in the past)
const overduePayment = {
  id: "pay-2",
  orderId: "PO-002",
  supplierName: "XYZ Suppliers",
  productName: "Ibuprofen",
  paymentType: "FINAL",
  paymentLabel: "Final 50%",
  quantity: 50,
  amount: 3000,
  totalOrderAmount: 6000,
  dueDate: makeTimestamp(pastDate),
  createdAt: makeTimestamp(new Date()),
  status: "PENDING", // will be auto-marked OVERDUE
  supplierId: "sup-2",
  purchaseOrderId: "po-doc-2",
};

// A PAID payment
const paidPayment = {
  id: "pay-3",
  orderId: "PO-003",
  supplierName: "MediCo",
  productName: "Face Cream",
  paymentType: "FINAL",
  paymentLabel: "Final 50%",
  quantity: 200,
  amount: 8000,
  totalOrderAmount: 16000,
  dueDate: makeTimestamp(futureDate),
  createdAt: makeTimestamp(new Date()),
  paidDate: makeTimestamp(new Date()),
  status: "PAID",
  supplierId: "sup-3",
  purchaseOrderId: "po-doc-3",
};

// Helper: mock getDocs to return payments
const mockGetDocs = (payments) => {
  getDocs.mockResolvedValue({
    docs: payments.map((p) => ({ id: p.id, data: () => p })),
    empty: payments.length === 0,
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AdminPayments Component", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true); // auto-confirm dialogs
  });

  // ── 1. Rendering ─────────────────────────────────────────────────────────────

  it("renders the page header", async () => {
    mockGetDocs([]);
    render(<AdminPayments />);
    expect(screen.getByText("Payments Management")).toBeInTheDocument();
  });

  it("renders all status filter buttons", async () => {
    mockGetDocs([]);
    render(<AdminPayments />);
    ["All", "PENDING", "PAID", "OVERDUE"].forEach((status) => {
      expect(screen.getByText(status)).toBeInTheDocument();
    });
  });

  it("renders the search input", async () => {
    mockGetDocs([]);
    render(<AdminPayments />);
    expect(
      screen.getByPlaceholderText("Search by PO ID, Supplier, or Product...")
    ).toBeInTheDocument();
  });

  it("shows 'No payments found' when list is empty", async () => {
    mockGetDocs([]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getByText("No payments found")).toBeInTheDocument();
    });
  });

  it("shows loading text while fetching", () => {
    // Keep getDocs pending so loading stays true
    getDocs.mockReturnValue(new Promise(() => {}));
    render(<AdminPayments />);
    expect(screen.getByText("Loading payments...")).toBeInTheDocument();
  });

  // ── 2. Summary Cards ──────────────────────────────────────────────────────────

  it("renders all 7 summary stat cards", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      const cards = screen.getAllByTestId("card");
      expect(cards).toHaveLength(7);
    });
  });

  it("shows correct pending count in summary card", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getByText(/Pending: 1/)).toBeInTheDocument();
    });
  });

  it("shows correct paid count in summary card", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getByText(/Paid: 1/)).toBeInTheDocument();
    });
  });

  // ── 3. Payment List Display ───────────────────────────────────────────────────

  it("displays payment rows after loading", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getByText("PO-001")).toBeInTheDocument();
      expect(screen.getByText("ABC Suppliers")).toBeInTheDocument();
      expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    });
  });

  it("shows Pay button for non-PAID payments", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getByText("Pay")).toBeInTheDocument();
    });
  });

  it("does NOT show Pay button for PAID payments", async () => {
    mockGetDocs([paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.queryByText("Pay")).not.toBeInTheDocument();
    });
  });

  it("shows View button for every payment", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => {
      expect(screen.getAllByText("View")).toHaveLength(2);
    });
  });

  // ── 4. Auto Overdue Detection ─────────────────────────────────────────────────

  it("auto-marks PENDING payment with past due date as OVERDUE", async () => {
    mockGetDocs([overduePayment]);
    updateDoc.mockResolvedValue();
    render(<AdminPayments />);
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "OVERDUE" })
      );
    });
  });

  it("does NOT call updateDoc for payments with future due dates", async () => {
    mockGetDocs([pendingPayment]); // due date is in the future
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("does NOT call updateDoc for already PAID payments", async () => {
    mockGetDocs([paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-003"));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  // ── 5. Search Filtering ───────────────────────────────────────────────────────

  it("filters by PO ID", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));

    fireEvent.change(
      screen.getByPlaceholderText("Search by PO ID, Supplier, or Product..."),
      { target: { value: "PO-001" } }
    );

    expect(screen.getByText("PO-001")).toBeInTheDocument();
    expect(screen.queryByText("PO-003")).not.toBeInTheDocument();
  });

  it("filters by supplier name", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("ABC Suppliers"));

    fireEvent.change(
      screen.getByPlaceholderText("Search by PO ID, Supplier, or Product..."),
      { target: { value: "MediCo" } }
    );

    expect(screen.getByText("MediCo")).toBeInTheDocument();
    expect(screen.queryByText("ABC Suppliers")).not.toBeInTheDocument();
  });

  it("filters by product name", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Paracetamol"));

    fireEvent.change(
      screen.getByPlaceholderText("Search by PO ID, Supplier, or Product..."),
      { target: { value: "Face Cream" } }
    );

    expect(screen.getByText("Face Cream")).toBeInTheDocument();
    expect(screen.queryByText("Paracetamol")).not.toBeInTheDocument();
  });

  it("shows 'No payments found' when search has no match", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));

    fireEvent.change(
      screen.getByPlaceholderText("Search by PO ID, Supplier, or Product..."),
      { target: { value: "zzznomatch" } }
    );

    expect(screen.getByText("No payments found")).toBeInTheDocument();
  });

  // ── 6. Status Filter ──────────────────────────────────────────────────────────

  it("filters to show only PAID payments", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));

    fireEvent.click(screen.getByText("PAID"));

    expect(screen.getByText("PO-003")).toBeInTheDocument();
    expect(screen.queryByText("PO-001")).not.toBeInTheDocument();
  });

  it("filters to show only PENDING payments", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));

    fireEvent.click(screen.getByText("PENDING"));

    expect(screen.getByText("PO-001")).toBeInTheDocument();
    expect(screen.queryByText("PO-003")).not.toBeInTheDocument();
  });

  it("shows all payments when 'All' filter is selected", async () => {
    mockGetDocs([pendingPayment, paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("PO-001"));

    fireEvent.click(screen.getByText("PAID")); // narrow
    fireEvent.click(screen.getByText("All"));  // reset

    expect(screen.getByText("PO-001")).toBeInTheDocument();
    expect(screen.getByText("PO-003")).toBeInTheDocument();
  });

  // ── 7. View Modal ─────────────────────────────────────────────────────────────

  it("opens payment detail modal when View is clicked", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));

    expect(screen.getByText("Payment Details")).toBeInTheDocument();
    expect(screen.getByText("ABC Suppliers")).toBeInTheDocument();
  });

  it("closes the modal when × button is clicked", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("×"));

    expect(screen.queryByText("Payment Details")).not.toBeInTheDocument();
  });

  it("closes the modal when backdrop is clicked", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));
    // Click the backdrop (the fixed overlay div)
    fireEvent.click(screen.getByText("Payment Details").closest(".fixed") || document.querySelector(".fixed"));

    await waitFor(() => {
      expect(screen.queryByText("Payment Details")).not.toBeInTheDocument();
    });
  });

  it("shows 'Mark as Paid' button in modal for non-PAID payments", async () => {
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));

    expect(screen.getByText("✓ Mark as Paid")).toBeInTheDocument();
  });

  it("does NOT show 'Mark as Paid' button in modal for PAID payments", async () => {
    mockGetDocs([paidPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));

    expect(screen.queryByText("✓ Mark as Paid")).not.toBeInTheDocument();
  });

  it("shows INITIAL payment context note in modal", async () => {
    mockGetDocs([pendingPayment]); // paymentType: INITIAL
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("View"));

    fireEvent.click(screen.getByText("View"));

    expect(
      screen.getByText(/initial 50% payment/i)
    ).toBeInTheDocument();
  });

  // ── 8. Mark As Paid ───────────────────────────────────────────────────────────

  it("calls updateDoc when Pay button is clicked and confirmed", async () => {
    mockGetDocs([pendingPayment]);
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: "notif-1" });
    // Mock the invoice query returning empty
    getDocs
      .mockResolvedValueOnce({
        docs: [{ id: "pay-1", data: () => pendingPayment }],
      })
      .mockResolvedValueOnce({ empty: true, docs: [] }); // invoice query

    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Pay"));

    fireEvent.click(screen.getByText("Pay"));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "PAID" })
      );
    });
  });

  it("does NOT proceed if user cancels the confirm dialog", async () => {
    window.confirm = vi.fn(() => false); // user clicks Cancel
    mockGetDocs([pendingPayment]);
    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Pay"));

    fireEvent.click(screen.getByText("Pay"));

    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("sends a notification after marking INITIAL payment as paid", async () => {
    mockGetDocs([pendingPayment]);
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: "notif-1" });
    getDocs
      .mockResolvedValueOnce({
        docs: [{ id: "pay-1", data: () => pendingPayment }],
      })
      .mockResolvedValueOnce({ empty: true, docs: [] }); // invoice query

    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Pay"));

    fireEvent.click(screen.getByText("Pay"));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: "INITIAL_PAYMENT_PAID" })
      );
    });
  });

  it("shows success alert after marking as paid", async () => {
    mockGetDocs([pendingPayment]);
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: "notif-1" });
    getDocs
      .mockResolvedValueOnce({
        docs: [{ id: "pay-1", data: () => pendingPayment }],
      })
      .mockResolvedValueOnce({ empty: true, docs: [] });

    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Pay"));

    fireEvent.click(screen.getByText("Pay"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Initial payment marked as paid")
      );
    });
  });

  it("shows error alert if markAsPaid throws", async () => {
    mockGetDocs([pendingPayment]);
    updateDoc.mockRejectedValue(new Error("Firestore error"));

    render(<AdminPayments />);
    await waitFor(() => screen.getByText("Pay"));

    fireEvent.click(screen.getByText("Pay"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("Failed to update payment")
      );
    });
  });

});
