import React from "react";
import {
  Package,
  FileText,
  Factory,
  Building2,
  DollarSign,
  CheckCircle2,
  XCircle,
  StickyNote,
  X,
  CheckCheck,
  Ban,
} from "lucide-react";
import ModalWrap from "./ModalWrap"; // adjust path as needed

// ─── Status badge ─────────────────────────────────────────────────────────────
const statusConfig = {
  PENDING:  { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: "Pending",  dot: "#eab308" },
  APPROVED: { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Approved", dot: "#22c55e" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Rejected", dot: "#ef4444" },
};

function StatusBadge({ status }) {
  const s = statusConfig[status] ?? {
    bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", label: status ?? "Unknown", dot: "#94a3b8",
  };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: s.bg, color: s.color,
        border: `1.5px solid ${s.border}`,
        borderRadius: 999, padding: "4px 14px",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.03em",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, iconColor = "#94a3b8" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Icon size={15} color={iconColor} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <h4 style={{
        margin: 0, fontSize: 13, fontWeight: 700,
        color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        {title}
      </h4>
      <div style={{ flex: 1, height: 1, background: "#f1f5f9", marginLeft: 4 }} />
    </div>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono = false, accent = false }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", padding: "9px 0",
      borderBottom: "1px solid #f8fafc",
    }}>
      <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500, flexShrink: 0, marginRight: 12 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        fontWeight: accent ? 700 : 600,
        color: accent ? "#0f766e" : "#1e293b",
        fontFamily: mono ? "'Courier New', monospace" : "inherit",
        textAlign: "right",
        wordBreak: "break-all",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #f1f5f9",
      borderRadius: 14,
      padding: "18px 20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function OrderDetailsModal({ order, onClose, onApprove, onReject, formatDate }) {
  if (!order) return null;

  const productName  = order.product      || order.productName || "—";
  const supplierName = order.supplierName || order.supplier    || "—";
  const totalAmount  = Number(order.amount || order.totalAmount || 0);
  const unitPrice    = Number(order.unitPrice || 0);
  const quantity     = order.quantity ?? "—";
  const status       = (order.status ?? "PENDING").toUpperCase();
  const isPending    = status === "PENDING";

  return (
    <ModalWrap onClose={onClose} maxW="max-w-[740px]">

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: "16px 16px 0 0",
        padding: "28px 28px 22px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(255,255,255,0.04)", pointerEvents: "none",
        }} />

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", gap: 12, position: "relative",
        }}>
          <div>
            <p style={{
              margin: "0 0 6px", fontSize: 12, fontWeight: 600,
              color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              Purchase Order
            </p>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              {order.poId || order.id || "—"}
            </h2>
            <StatusBadge status={status} />
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 10, width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          >
            <X size={16} color="#94a3b8" strokeWidth={2.5} />
          </button>
        </div>

        {/* Callout tiles */}
        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Total Amount", value: `Rs. ${totalAmount.toFixed(2)}`, highlight: true },
            { label: "Quantity",     value: `${quantity} units` },
            { label: "Unit Price",   value: unitPrice > 0 ? `Rs. ${unitPrice.toFixed(2)}` : "—" },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{
              background: highlight ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${highlight ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 10, padding: "10px 16px", flex: "1 1 120px",
            }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: highlight ? "#34d399" : "#e2e8f0" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Product + Order Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <SectionTitle icon={Package} title="Product" iconColor="#6366f1" />
            <DetailRow label="Product Name"   value={productName} />
            <DetailRow label="Product ID"     value={order.productId}      mono />
            <DetailRow label="Admin Prod. ID" value={order.adminProductId} mono />
            <DetailRow label="Category"       value={order.category} />
            <DetailRow label="Unit Price"     value={unitPrice > 0 ? `Rs. ${unitPrice.toFixed(2)}` : null} />
            <DetailRow label="Quantity"       value={quantity !== "—" ? `${quantity} units` : "—"} />
          </Card>

          <Card>
            <SectionTitle icon={FileText} title="Order Info" iconColor="#f59e0b" />
            <DetailRow label="PO Number"     value={order.poId}  mono />
            <DetailRow label="Order ID"      value={order.id}    mono />
            <DetailRow label="Status"        value={status} />
            <DetailRow label="Payment Terms" value={order.paymentTerms} />
            <DetailRow label="Delivery Date" value={order.deliveryDate ? formatDate(order.deliveryDate) : null} />
            <DetailRow label="Created At"    value={order.createdAt  ? formatDate(order.createdAt)  : null} />
            <DetailRow label="Updated At"    value={order.updatedAt  ? formatDate(order.updatedAt)  : null} />
          </Card>
        </div>

        {/* Supplier + Pharmacy */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <SectionTitle icon={Factory} title="Supplier" iconColor="#8b5cf6" />
            <DetailRow label="Supplier Name" value={supplierName} />
            <DetailRow label="Supplier ID"   value={order.supplierId} mono />
            <DetailRow label="Email"         value={order.supplierEmail} />
            <DetailRow label="Phone"         value={order.supplierPhone} />
          </Card>

          <Card>
            <SectionTitle icon={Building2} title="Pharmacy / Buyer" iconColor="#0ea5e9" />
            <DetailRow label="Pharmacy"      value={order.pharmacy     || order.buyer || "MediCareX"} />
            <DetailRow label="Contact"       value={order.buyerContact || order.pharmacyContact} />
            <DetailRow label="Shipping Addr" value={order.shippingAddress} />
            <DetailRow label="Billing Addr"  value={order.billingAddress} />
          </Card>
        </div>

        {/* Financial Summary */}
        <Card>
          <SectionTitle icon={DollarSign} title="Financial Summary" iconColor="#10b981" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
            <div>
              <DetailRow label="Subtotal"   value={order.subtotal  != null ? `Rs. ${Number(order.subtotal).toFixed(2)}`  : null} />
              <DetailRow label="Tax Rate"   value={order.taxRate   != null ? `${order.taxRate}%`                         : null} />
              <DetailRow label="Tax Amount" value={order.taxAmount != null ? `Rs. ${Number(order.taxAmount).toFixed(2)}` : null} />
              <DetailRow label="Discount"   value={order.discount  != null ? `Rs. ${Number(order.discount).toFixed(2)}`  : null} />
            </div>
            <div>
              <DetailRow label="Total Amount"          value={`Rs. ${totalAmount.toFixed(2)}`}            accent />
              <DetailRow label="Initial Payment (50%)" value={`Rs. ${(totalAmount * 0.5).toFixed(2)}`} />
              <DetailRow label="Balance Due (50%)"     value={`Rs. ${(totalAmount * 0.5).toFixed(2)}`} />
              <DetailRow label="Payment Status"        value={order.paymentStatus} />
            </div>
          </div>
        </Card>

        {/* Approval Details */}
        {status === "APPROVED" && (
          <Card style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}>
            <SectionTitle icon={CheckCircle2} title="Approval Details" iconColor="#16a34a" />
            <DetailRow label="Approved At"   value={order.approvedAt   ? formatDate(order.approvedAt)   : null} />
            <DetailRow label="Approval Date" value={order.approvalDate ? formatDate(order.approvalDate) : null} />
            <DetailRow label="Approved By"   value={order.approvedBy} />
          </Card>
        )}

        {/* Rejection Details */}
        {status === "REJECTED" && (
          <Card style={{ borderColor: "#fecaca", background: "#fff5f5" }}>
            <SectionTitle icon={XCircle} title="Rejection Details" iconColor="#dc2626" />
            <DetailRow label="Rejected At"    value={order.rejectedAt    ? formatDate(order.rejectedAt)    : null} />
            <DetailRow label="Rejection Date" value={order.rejectionDate ? formatDate(order.rejectionDate) : null} />
            <DetailRow label="Rejected By"    value={order.rejectedBy} />
            <DetailRow label="Reason"         value={order.rejectionReason} />
          </Card>
        )}

        {/* Notes */}
        {(order.notes || order.adminNotes || order.specialInstructions) && (
          <Card>
            <SectionTitle icon={StickyNote} title="Notes & Instructions" iconColor="#f59e0b" />
            {order.notes               && <DetailRow label="Notes"                value={order.notes} />}
            {order.adminNotes          && <DetailRow label="Admin Notes"          value={order.adminNotes} />}
            {order.specialInstructions && <DetailRow label="Special Instructions" value={order.specialInstructions} />}
          </Card>
        )}

        {/* ── Action Buttons ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, flexWrap: "wrap" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 22px", borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "#fff", color: "#64748b",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff";    e.currentTarget.style.borderColor = "#e2e8f0"; }}
          >
            <X size={14} strokeWidth={2.5} />
            Close
          </button>

          {isPending && (
            <>
              <button
                onClick={() => { onClose(); onReject(order); }}
                style={{
                  padding: "10px 22px", borderRadius: 10,
                  border: "1.5px solid #fca5a5",
                  background: "#fff5f5", color: "#dc2626",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff5f5"; }}
              >
                <Ban size={14} strokeWidth={2.5} />
                Reject Order
              </button>

              <button
                onClick={() => { onClose(); onApprove(order.id, order); }}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 2px 12px rgba(16,185,129,0.35)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1";   e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <CheckCheck size={15} strokeWidth={2.5} />
                Approve Order
              </button>
            </>
          )}
        </div>

      </div>
    </ModalWrap>
  );
}