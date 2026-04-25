import { useEffect, useState, useRef } from 'react';
import {
  MessageSquare, Mail, Send, Inbox,
  CheckCheck, MailOpen, Clock,
} from 'lucide-react';

// Base URL for all API calls — falls back to localhost in development
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

// Returns background, text color, border color, and icon for each message status
function statusStyle(status) {
  if (status === 'replied') return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)", icon: CheckCheck };
  if (status === 'read')    return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)", icon: MailOpen   };
  return                           { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)", icon: Clock      };
}

// Renders a small colored pill showing the current message status with an icon
function StatusBadge({ status }) {
  const s = statusStyle(status || 'unread');
  const Icon = s.icon;
  return (
    <span className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap inline-flex items-center gap-1"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <Icon size={10} />
      {status || 'unread'}
    </span>
  );
}

export default function MessagesPage() {
  const [messages, setMessages]     = useState([]);
  // ID of the currently selected message shown in the right panel
  const [selectedId, setSelectedId] = useState(null);
  // Controlled textarea value for composing or updating a reply
  const [reply, setReply]           = useState('');
  const [sending, setSending]       = useState(false);
  // Ref to the polling interval so it can be cleared on unmount
  const pollRef = useRef(null);

  // Fetches all contact messages from the backend
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/contact`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // Poll every 10 seconds instead of real-time Firebase listener
  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 10000);
    // Clear the interval when the component unmounts to prevent memory leaks
    return () => clearInterval(pollRef.current);
  }, []);

  // Derives the full selected message object from the messages array
  const selected = messages.find((m) => m.id === selectedId);

  // Syncs reply textarea with the selected message's existing reply when switching messages
  useEffect(() => {
    if (selected) setReply(selected.reply || '');
  }, [selected?.reply, selectedId]);

  // Selects a message and marks it as read via the backend if it was previously unread
  const handleSelect = async (msg) => {
    setSelectedId(msg.id);
    if (msg.status === 'unread') {
      try {
        await fetch(`${API_BASE}/contact/${msg.id}/read`, { method: 'PUT' });
        // Update local state immediately so UI reflects the change without waiting for next poll
        setMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m)
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  // Sends or updates the reply for the selected message via the backend
  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/contact/${selectedId}/reply`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reply }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      // Update local state immediately so status changes to 'replied' without waiting for next poll
      setMessages(prev =>
        prev.map(m => m.id === selectedId ? { ...m, reply, status: 'replied' } : m)
      );
      alert('Reply sent successfully.');
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Count of messages not yet opened — shown as a red badge in the panel header
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="flex overflow-hidden font-['DM_Sans',sans-serif] gap-0" style={{ height: "calc(100vh - 60px)" }}>

      {/* Left panel — scrollable message list with status badges */}
      <div className="w-[300px] shrink-0 bg-white border-r border-[rgba(26,135,225,0.18)] flex flex-col rounded-[14px_0_0_14px] overflow-hidden shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
        <div className="px-5 py-[18px] border-b border-[rgba(26,135,225,0.18)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#1e293b]">Messages</h2>
            {/* Red unread badge — only rendered when unread messages exist */}
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-[9px] py-[3px] rounded-[20px] bg-[rgba(239,68,68,0.1)] text-red-600 border border-[rgba(239,68,68,0.25)] uppercase tracking-[0.06em]">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#64748b] mt-1">
            {messages.length} total message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Empty state when no messages have been received yet */}
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Inbox size={32} color={C.textMuted} className="mx-auto mb-[10px]" />
              <p className="text-[13px] text-[#475569]">No messages yet.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelected = selectedId === msg.id;
              const isUnread   = msg.status === 'unread';
              return (
                // Selected row gets a blue left border and light background highlight
                <div key={msg.id} onClick={() => handleSelect(msg)}
                  className="px-[18px] py-[14px] border-b border-[rgba(26,135,225,0.18)] cursor-pointer transition-[background] duration-150"
                  style={{
                    background: isSelected ? "rgba(26,135,225,0.06)" : C.surface,
                    borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent",
                  }}>
                  <div className="flex justify-between items-start gap-2">
                    {/* Unread messages use bold weight to stand out */}
                    <p className={`text-[13px] ${isUnread ? "font-bold" : "font-semibold"} text-[#1e293b] overflow-hidden text-ellipsis whitespace-nowrap flex-1`}>
                      {msg.name}
                    </p>
                    <StatusBadge status={msg.status} />
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-[3px]">{msg.email}</p>
                  <p className="text-[11px] text-[#475569] mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {msg.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — message detail view and reply composer */}
      <div className="flex-1 flex flex-col bg-[#f1f5f9] overflow-hidden rounded-[0_14px_14px_0] border border-[rgba(26,135,225,0.18)] border-l-0 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
        {/* Empty state shown before any message is selected */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-[10px]">
            <MessageSquare size={44} color={C.textMuted} />
            <p className="text-[15px] font-semibold text-[#475569]">Select a message to view</p>
            <p className="text-[12px] text-[#64748b]">Choose a conversation from the left panel.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Sender info card with name, email, and current status */}
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 mb-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[16px] font-bold text-[#1e293b]">{selected.name}</p>
                    <div className="flex items-center gap-[5px] mt-1">
                      <Mail size={11} color={C.textMuted} />
                      <p className="text-[12px] text-[#64748b]">{selected.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* Customer's original message body */}
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 mb-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-[10px]">Customer Message</p>
                <div className="bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)] rounded-[10px] px-4 py-3">
                  <p className="text-[13px] text-[#1e293b] leading-[1.7]">{selected.message}</p>
                </div>
              </div>

              {/* Existing reply card — only rendered when a reply has already been sent */}
              {selected.reply && (
                <div className="bg-[rgba(26,135,225,0.05)] border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                  <p className="text-[10px] font-bold text-[#1a87e1] uppercase tracking-[0.08em] mb-[10px]">Your Reply</p>
                  <p className="text-[13px] text-[#1e293b] leading-[1.7]">{selected.reply}</p>
                </div>
              )}
            </div>

            {/* Reply composer — label changes to 'Update Reply' if a reply already exists */}
            <div className="border-t border-[rgba(26,135,225,0.18)] bg-white px-5 py-4">
              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">
                {selected.reply ? 'Update Reply' : 'Write a Reply'}
              </p>
              <textarea rows={3} value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full border border-[rgba(26,135,225,0.18)] rounded-[10px] px-[14px] py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none resize-none bg-[#f1f5f9] box-border" />
              {/* Send button — disabled while sending or if reply textarea is empty */}
              <button onClick={handleReply} disabled={sending || !reply.trim()}
                className={`mt-[10px] inline-flex items-center gap-[7px] text-white border-none rounded-[9px] px-5 py-[10px] text-[13px] font-semibold font-['DM_Sans',sans-serif] transition-all ${
                  sending || !reply.trim()
                    ? "bg-[rgba(26,135,225,0.35)] cursor-not-allowed shadow-none"
                    : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
                }`}>
                <Send size={13} />
                {sending ? 'Sending...' : selected.reply ? 'Update Reply' : 'Send Reply'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}