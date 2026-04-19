import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase";

export default function AccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState({
    id: null,
    action: null,
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "pendingRequests"),
        orderBy("requestedAt", "desc"),
      );
      const snap = await getDocs(q);
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    if (
      !window.confirm(
        `Approve account for ${request.companyName || request.fullName}?`,
      )
    )
      return;
    setActionLoading({ id: request.id, action: "approve" });
    try {
      const res = await fetch(
        `http://localhost:5000/api/account-requests/${request.id}/approve`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      await fetchRequests();
      alert(
        `Approved! An email with their temporary password has been sent to ${request.email}`,
      );
    } catch (err) {
      alert("Failed to approve: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request) => {
    if (
      !window.confirm(
        `Reject request from ${request.companyName || request.fullName}?`,
      )
    )
      return;
    setActionLoading({ id: request.id, action: "reject" });
    try {
      const res = await fetch(
        `http://localhost:5000/api/account-requests/${request.id}/reject`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      await fetchRequests();
      alert(`Request rejected. A notification email has been sent.`);
    } catch (err) {
      alert("Failed to reject: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.type === filter);
  const pending = filtered.filter((r) => r.status === "pending");
  const processed = filtered.filter((r) => r.status !== "pending");

  const RequestCard = ({ request }) => {
    const isSupplier = request.type === "supplier";
    const isPending = request.status === "pending";
    const isApproved = request.status === "approved";
    const isProcessing = actionLoading.id === request.id;
    const isApprovingThis = isProcessing && actionLoading.action === "approve";
    const isRejectingThis = isProcessing && actionLoading.action === "reject";
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border-l-4 px-6 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${isSupplier ? "border-blue-400" : "border-emerald-400"}
        ${!isPending ? "opacity-70" : ""}`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase
              ${
                isSupplier
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isSupplier ? "Supplier" : "Pharmacist"}
            </span>
            {/* Status badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase
              ${
                isPending
                  ? "bg-amber-100 text-amber-700"
                  : isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {request.status}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {request.requestedAt?.toDate().toLocaleDateString()}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
          {isSupplier ? (
            <>
              <Info label="Company" value={request.companyName} />
              <Info label="Email" value={request.email} />
              <Info label="Phone" value={request.phone} />
              <Info label="Contact" value={request.contactPerson} />
              <Info label="Reg. No" value={request.businessRegNo} />
              <Info label="Bank" value={request.bankName} />
              <Info label="Address" value={request.businessAddress} span />
              {request.categories?.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">
                    Categories
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {request.categories.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Info label="Name" value={request.fullName} />
              <Info label="Email" value={request.email} />
              <Info label="Phone" value={request.phone} />
              <Info label="NIC" value={request.nicNumber} />
              <Info label="License No" value={request.licenseNumber} />
              <Info label="Expiry" value={request.licenseExpiry} />
              <Info
                label="Specialization"
                value={request.specialization}
                span
              />
            </>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleApprove(request)}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-500 text-white text-sm font-bold hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isApprovingThis ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Approving...
                </span>
              ) : (
                "✓ Approve"
              )}
            </button>
            <button
              onClick={() => handleReject(request)}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRejectingThis ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  Rejecting...
                </span>
              ) : (
                "✕ Reject"
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const Info = ({ label, value, span }) => (
    <div className={span ? "col-span-2" : ""}>
      <span className="text-[11px] text-slate-400 font-semibold uppercase">
        {label}
      </span>
      <p className="text-sm font-medium text-slate-800 mt-0.5">
        {value || "—"}
      </p>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">
            Account Requests
          </h1>
          <p className="text-slate-500 text-[15px]">
            Review and approve supplier and pharmacist registrations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-7">
        {[
          {
            label: "Pending",
            value: requests.filter((r) => r.status === "pending").length,
            accent: "border-amber-400",
          },
          {
            label: "Approved",
            value: requests.filter((r) => r.status === "approved").length,
            accent: "border-emerald-400",
          },
          {
            label: "Rejected",
            value: requests.filter((r) => r.status === "rejected").length,
            accent: "border-red-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white px-6 py-5 rounded-xl shadow-sm border-l-4 ${s.accent} flex justify-between items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <span className="text-sm text-slate-500 font-medium">
              {s.label}
            </span>
            <span className="text-3xl font-bold text-slate-800">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex gap-3 flex-wrap">
        {[
          { key: "all", label: "All Requests" },
          { key: "supplier", label: "Suppliers" },
          { key: "pharmacist", label: "Pharmacists" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full border-2 text-sm font-medium cursor-pointer transition-all duration-200
              ${
                filter === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-20 text-center text-slate-500 text-lg">
          Loading requests...
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Pending Requests ({pending.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pending.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            </div>
          )}

          {/* Processed Requests */}
          {processed.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                Processed Requests ({processed.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {processed.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm py-20 text-center">
              <p className="text-4xl mb-4">📋</p>
              <p className="text-lg text-slate-500 mb-2">No requests found</p>
              <small className="text-sm text-slate-400">All caught up!</small>
            </div>
          )}
        </>
      )}
    </div>
  );
}
