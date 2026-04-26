import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, orderBy,
  query, doc, updateDoc,
} from 'firebase/firestore';
import {
  Mail, Send, Inbox,
  Image, Mic, XCircle, Trash2,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f8fafc",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

// ── Status badge helper ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    unread:  { label: "Unread",  bg: "rgba(239,68,68,0.1)",   text: "#dc2626", border: "rgba(239,68,68,0.25)"   },
    read:    { label: "Read",    bg: "rgba(100,116,139,0.1)", text: "#475569", border: "rgba(100,116,139,0.25)" },
    replied: { label: "Replied", bg: "rgba(26,135,225,0.1)",  text: "#1a87e1", border: "rgba(26,135,225,0.25)"  },
  };
  const s = map[(status || 'read').toLowerCase()] || map.read;
  return (
    <span
      className="text-[10px] font-bold px-[8px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

export default function MessagesInbox() {
  const [messages,   setMessages]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reply,      setReply]      = useState('');
  const [sending,    setSending]    = useState(false);

  // Multimedia states
  const [replyImage,   setReplyImage]   = useState(null);
  const [replyVoice,   setReplyVoice]   = useState(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);

  // Derived values
  const selected    = messages.find((m) => m.id === selectedId);
  const unreadCount = messages.filter((m) => (m.status || '').toLowerCase() === 'unread').length;

  // Real-time listener – messages ordered newest-first, filtering out soft-deleted ones
  useEffect(() => {
    const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(all.filter((m) => (m.status || '').toLowerCase() !== 'deleted'));
    });
    return () => unsub();
  }, []);

  /**
   * Soft-deletes a message by setting status to 'deleted'.
   * Performs an optimistic update to make the removal feel instant.
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this message?')) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
    try {
      await updateDoc(doc(db, 'contactMessages', id), { status: 'deleted' });
    } catch (err) {
      alert(`Failed to remove: ${err.message}`);
    }
  };

  /**
   * Selects a message and auto-marks it as "read" if it was "unread".
   * Pre-populates the reply textarea with any existing reply.
   */
  const handleSelect = async (msg) => {
    setSelectedId(msg.id);
    setReply(msg.reply || '');
    setReplyImage(msg.replyImage || null);
    setReplyVoice(msg.replyVoice || null);
    if (msg.status === 'unread') {
      await updateDoc(doc(db, 'contactMessages', msg.id), { status: 'read' });
    }
  };

  /**
   * Saves the reply text (and any multimedia) to Firestore and sets status to "replied".
   */
  const handleReply = async () => {
    if (!reply.trim() && !replyImage && !replyVoice) return;
    setSending(true);
    try {
      await updateDoc(doc(db, 'contactMessages', selectedId), {
        reply,
        replyImage,
        replyVoice,
        status: 'replied',
        repliedAt: new Date(),
      });
      setReply('');
      setReplyImage(null);
      setReplyVoice(null);
      alert('Reply sent successfully.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ── Multimedia helpers ─────────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReplyImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setReplyVoice(reader.result);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex overflow-hidden font-['DM_Sans',sans-serif] gap-0"
      style={{ height: "calc(100vh - 60px)" }}
    >
      {/* ── Left panel: scrollable message list ── */}
      <div className="w-[300px] shrink-0 bg-white border-r border-[rgba(26,135,225,0.18)] flex flex-col rounded-[14px_0_0_14px] overflow-hidden shadow-[0_1px_4px_rgba(26,135,225,0.07)]">

        {/* Sidebar header */}
        <div className="px-5 py-[18px] border-b border-[rgba(26,135,225,0.18)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#1e293b]">Messages</h2>
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

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
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
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className="px-[18px] py-[14px] border-b border-[rgba(26,135,225,0.18)] cursor-pointer transition-[background] duration-150"
                  style={{
                    background: isSelected ? "rgba(26,135,225,0.06)" : C.surface,
                    borderLeft: isSelected ? `3px solid ${C.accent}` : "3px solid transparent",
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-[13px] ${isUnread ? "font-bold" : "font-semibold"} text-[#1e293b] overflow-hidden text-ellipsis whitespace-nowrap flex-1`}>
                      {msg.name}
                    </p>
                    <div className="flex items-center gap-2 group/item">
                      <StatusBadge status={msg.status} />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Quick Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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

      {/* ── Right panel: message detail + reply composer ── */}
      <div className="flex-1 flex flex-col bg-[#f8fafc] rounded-[0_14px_14px_0] overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Mail size={40} color={C.textMuted} className="mb-3" />
            <p className="text-[14px] font-semibold text-[#475569]">Select a message to view</p>
          </div>
        ) : (
          <>
            {/* Scrollable detail area */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Sender info card */}
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 mb-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[16px] font-bold text-[#1e293b]">{selected.name}</p>
                    <div className="flex items-center gap-[5px] mt-1">
                      <Mail size={11} color={C.textMuted} />
                      <p className="text-[12px] text-[#64748b]">{selected.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selected.status} />
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                      title="Delete Conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer message bubble */}
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 mb-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-[10px]">
                  Customer Message
                </p>
                <div className="bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)] rounded-[10px] px-4 py-3">
                  <p className="text-[13px] text-[#1e293b] leading-[1.7] mb-3">{selected.message}</p>
                  {(selected.customerImage || selected.customerVoice) && (
                    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-slate-200">
                      {selected.customerImage && (
                        <img src={selected.customerImage} className="max-w-full rounded-lg shadow-sm border border-white" alt="Customer attachment" />
                      )}
                      {selected.customerVoice && (
                        <audio controls src={selected.customerVoice} className="w-full h-8" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Existing reply */}
              {selected.reply && (
                <div className="bg-[rgba(26,135,225,0.05)] border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-4 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
                  <p className="text-[10px] font-bold text-[#1a87e1] uppercase tracking-[0.08em] mb-[10px]">
                    Your Reply
                  </p>
                  <p className="text-[13px] text-[#1e293b] leading-[1.7] mb-3">{selected.reply}</p>
                  {(selected.replyImage || selected.replyVoice) && (
                    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-blue-200/30">
                      {selected.replyImage && (
                        <img src={selected.replyImage} className="max-w-full rounded-lg shadow-sm border border-white" alt="Pharmacist attachment" />
                      )}
                      {selected.replyVoice && (
                        <audio controls src={selected.replyVoice} className="w-full h-8" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky reply composer */}
            <div className="border-t border-[rgba(26,135,225,0.18)] bg-white px-5 py-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.08em]">
                  {selected.reply ? 'Update Reply' : 'Write a Reply'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById('reply-img-input').click()}
                    className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-500 transition-colors border border-slate-200"
                    title="Attach Image"
                  >
                    <Image size={14} />
                  </button>
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    className={`p-2 rounded-lg transition-colors border ${
                      isRecording
                        ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-500'
                    }`}
                    title="Hold to Record Voice"
                  >
                    <Mic size={14} />
                  </button>
                </div>
              </div>

              <input type="file" id="reply-img-input" className="hidden" accept="image/*" onChange={handleImageSelect} />

              {/* Multimedia previews */}
              {(replyImage || replyVoice) && (
                <div className="mb-3 flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {replyImage && (
                    <div className="relative group">
                      <img src={replyImage} className="w-16 h-16 rounded-lg object-cover border border-white shadow-sm" alt="Preview" />
                      <button
                        onClick={() => setReplyImage(null)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle size={10} />
                      </button>
                    </div>
                  )}
                  {replyVoice && (
                    <div className="flex-1 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Voice Note Ready</span>
                      <button onClick={() => setReplyVoice(null)} className="ml-auto text-slate-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full border border-[rgba(26,135,225,0.18)] rounded-[10px] px-[14px] py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none resize-none bg-[#f1f5f9] box-border"
              />

              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={handleReply}
                  disabled={sending || (!reply.trim() && !replyImage && !replyVoice)}
                  className={`inline-flex items-center gap-[7px] text-white border-none rounded-[9px] px-5 py-[10px] text-[13px] font-semibold font-['DM_Sans',sans-serif] transition-all ${
                    sending || (!reply.trim() && !replyImage && !replyVoice)
                      ? "bg-[rgba(26,135,225,0.35)] cursor-not-allowed shadow-none"
                      : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
                  }`}
                >
                  <Send size={13} />
                  {sending ? 'Sending...' : selected.reply ? 'Update Reply' : 'Send Reply'}
                </button>
                {isRecording && (
                  <span className="text-[10px] font-black text-red-500 animate-pulse uppercase tracking-widest">
                    Recording...
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}