import { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, orderBy,
  query, doc, updateDoc
} from 'firebase/firestore';
import {
  MessageSquare, Mail, Send, Inbox,
  CheckCheck, MailOpen, Clock, Trash2
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

/**
 * Returns background, text colour, border and icon for a message status.
 * Statuses: "replied" → green, "read" → blue, default (unread) → amber.
 */
function statusStyle(status) {
  if (status === 'replied') return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)", icon: CheckCheck };
  if (status === 'read')    return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)", icon: MailOpen  };
  return                           { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)", icon: Clock     };
}

/** StatusBadge – pill with icon derived from the message status */
function StatusBadge({ status }) {
  const s = statusStyle(status || 'unread');
  const Icon = s.icon;
  return (
    <span
      className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap inline-flex items-center gap-1"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <Icon size={10} />
      {status || 'unread'}
    </span>
  );
}

// Sub-component to handle an individual message inside a customer's thread
function MessageItem({ msg }) {
  const [reply, setReply] = useState(msg.reply || '');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await updateDoc(doc(db, 'contactMessages', msg.id), {
        reply,
        status: 'replied',
      });
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await updateDoc(doc(db, 'contactMessages', msg.id), {
          isDeleted: true
        });
      } catch (err) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  if (msg.isDeleted) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-[14px] px-5 py-4 mb-4 flex items-center justify-between">
        <p className="text-[13px] text-slate-500 italic flex items-center gap-2">
          🚫 This message was deleted
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] p-5 mb-4 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status={msg.status} />
        <button onClick={handleDelete} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete Message">
          <Trash2 size={14} />
        </button>
      </div>
      
      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">Customer Message</p>
      <div className="bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)] rounded-[10px] px-4 py-3 mb-4">
        <p className="text-[13px] text-[#1e293b] leading-[1.7] whitespace-pre-wrap">{msg.message}</p>
      </div>

      {msg.reply ? (
        <div className="bg-[rgba(26,135,225,0.05)] border border-[rgba(26,135,225,0.18)] rounded-[10px] px-4 py-3">
          <p className="text-[10px] font-bold text-[#1a87e1] uppercase tracking-[0.08em] mb-2">Your Reply</p>
          <p className="text-[13px] text-[#1e293b] leading-[1.7] whitespace-pre-wrap">{msg.reply}</p>
        </div>
      ) : (
        <div className="mt-2">
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full border border-[rgba(26,135,225,0.18)] rounded-[10px] px-[14px] py-[10px] text-[13px] text-[#1e293b] outline-none resize-none bg-[#f1f5f9] box-border"
          />
          <button
            onClick={handleReply}
            disabled={sending || !reply.trim()}
            className={`mt-[10px] inline-flex items-center gap-[7px] text-white border-none rounded-[9px] px-5 py-2 text-[12px] font-semibold transition-all ${
              sending || !reply.trim()
                ? "bg-[rgba(26,135,225,0.35)] cursor-not-allowed shadow-none"
                : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
            }`}
          >
            <Send size={12} />
            {sending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Real-time listener – messages ordered newest-first
  useEffect(() => {
    const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Group messages by email
  const customers = useMemo(() => {
    const groups = {};
    messages.forEach(msg => {
      const email = msg.email || 'unknown@example.com';
      if (!groups[email]) {
        groups[email] = {
          email: email,
          name: msg.name || 'Unknown User',
          latestMessage: msg,
          allMessages: [],
          unreadCount: 0
        };
      }
      groups[email].allMessages.push(msg);
      if (msg.status === 'unread') {
        groups[email].unreadCount += 1;
      }
    });
    return Object.values(groups);
  }, [messages]);

  const selectedCustomer = customers.find(c => c.email === selectedEmail);

  const handleSelectCustomer = async (customer) => {
    setSelectedEmail(customer.email);
    // Mark all unread messages for this customer as read
    const unreadMsgs = customer.allMessages.filter(m => m.status === 'unread');
    for (const msg of unreadMsgs) {
      try {
        await updateDoc(doc(db, 'contactMessages', msg.id), { status: 'read' });
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  const totalUnread = customers.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex overflow-hidden gap-0" style={{ height: "calc(100vh - 60px)", position: 'relative' }}>
      
      {/* ── Left panel: scrollable customer list ── */}
      <div className="w-[320px] shrink-0 bg-white border-r border-[rgba(26,135,225,0.18)] flex flex-col rounded-[14px_0_0_14px] overflow-hidden shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
        {/* Sidebar header */}
        <div className="px-5 py-[18px] border-b border-[rgba(26,135,225,0.18)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#1e293b]">Customer Chats</h2>
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold px-[9px] py-[3px] rounded-[20px] bg-[rgba(239,68,68,0.1)] text-red-600 border border-[rgba(239,68,68,0.25)] uppercase tracking-[0.06em]">
                {totalUnread} unread
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#64748b] mt-1">
            {customers.length} total customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Inbox size={32} color={C.textMuted} className="mx-auto mb-[10px]" />
              <p className="text-[13px] text-[#475569]">No chats yet.</p>
            </div>
          ) : (
            customers.map((c) => {
              const isSelected = selectedEmail === c.email;
              const isUnread = c.unreadCount > 0;
              const preview = c.latestMessage.isDeleted ? "🚫 Deleted message" : c.latestMessage.message;
              
              return (
                <div
                  key={c.email}
                  onClick={() => handleSelectCustomer(c)}
                  className="px-[18px] py-[14px] border-b border-[rgba(26,135,225,0.18)] cursor-pointer transition-[background] duration-150"
                  style={{
                    background: isSelected ? "rgba(26,135,225,0.06)" : C.surface,
                    borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent",
                  }}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className={`text-[13px] ${isUnread ? "font-bold" : "font-semibold"} text-[#1e293b] overflow-hidden text-ellipsis whitespace-nowrap flex-1`}>
                      {c.name}
                    </p>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748b]">{c.email}</p>
                  <p className={`text-[11px] ${c.latestMessage.isDeleted ? 'text-slate-400 italic' : 'text-[#475569]'} mt-1 overflow-hidden text-ellipsis whitespace-nowrap`}>
                    {preview}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: message detail thread ── */}
      <div className="flex-1 flex flex-col bg-[#f1f5f9] overflow-hidden rounded-[0_14px_14px_0] border border-[rgba(26,135,225,0.18)] border-l-0 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
        {!selectedCustomer ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-[10px]">
            <MessageSquare size={44} color={C.textMuted} />
            <p className="text-[15px] font-semibold text-[#475569]">Select a chat to view</p>
            <p className="text-[12px] text-[#64748b]">Choose a customer from the left panel.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Thread Header */}
            <div className="bg-white border-b border-[rgba(26,135,225,0.18)] px-6 py-4 shadow-sm z-10 shrink-0">
              <p className="text-[16px] font-bold text-[#1e293b]">{selectedCustomer.name}</p>
              <div className="flex items-center gap-[5px] mt-1">
                <Mail size={11} color={C.textMuted} />
                <p className="text-[12px] text-[#64748b]">{selectedCustomer.email}</p>
              </div>
            </div>
            
            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse">
              {selectedCustomer.allMessages.map(msg => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}