import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc } from "firebase/firestore";
import { auth } from "../../services/firebase";

export default function AccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(null);

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

  const generateNextId = async (collectionName, prefix) => {
    const snapshot = await getDocs(collection(db, collectionName));
    let maxNum = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      const idField = `${collectionName.slice(0, -1)}Id`;
      if (data[idField]) {
        const num = parseInt(data[idField].replace(prefix, ""));
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
  };

  const handleApprove = async (request) => {
    if (
      !window.confirm(
        `Approve account for ${request.companyName || request.fullName}?`,
      )
    )
      return;
    setActionLoading(request.id);
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
    setActionLoading(request.id);
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
    const isProcessing = actionLoading === request.id;

    return (
      <div
        className={`bg-white rounded-xl border-2 p-5 transition-all
        ${isSupplier ? "border-blue-200" : "border-emerald-200"}
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
              {isProcessing ? (
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
              ✕ Reject
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
    <div className="p-8 bg-[#f5f9ff] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">
          Account Requests
        </h1>
        <p className="text-slate-500 text-[15px]">
          Review and approve supplier and pharmacist registrations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Pending",
            value: requests.filter((r) => r.status === "pending").length,
            color: "bg-amber-50  border-amber-200  text-amber-700",
          },
          {
            label: "Approved",
            value: requests.filter((r) => r.status === "approved").length,
            color: "bg-green-50  border-green-200  text-green-700",
          },
          {
            label: "Rejected",
            value: requests.filter((r) => r.status === "rejected").length,
            color: "bg-red-50    border-red-200    text-red-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border-2 p-4 text-center ${s.color}`}
          >
            <p className="text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-3 mb-6">
        {[
          { key: "all", label: "All Requests" },
          { key: "supplier", label: "Suppliers" },
          { key: "pharmacist", label: "Pharmacists" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2
              ${
                filter === f.key
                  ? "bg-gradient-to-r from-blue-900 to-blue-500 text-white border-blue-500 shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-blue-50"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-lg">
          Loading requests...
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
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
            <div className="text-center py-20 bg-white rounded-xl">
              <p className="text-4xl mb-4">📋</p>
              <p className="text-slate-500 text-lg font-medium">
                No requests found
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
