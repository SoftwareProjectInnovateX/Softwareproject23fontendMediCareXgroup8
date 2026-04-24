'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot
} from 'firebase/firestore';
import { Send, Mail, CheckCircle, MailOpen, Clock, Pill, MessageSquare } from 'lucide-react';

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

function statusStyle(status) {
  if (status === 'replied') return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)", icon: CheckCircle, label: "Replied"  };
  if (status === 'read')    return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)", icon: MailOpen,    label: "Read"     };
  return                           { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)", icon: Clock,       label: "Pending"  };
}

export default function ContactPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [myMessages, setMyMessages]         = useState([]);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!submittedEmail) return;
    if (unsubRef.current) unsubRef.current();

    const q = query(collection(db, 'contactMessages'), where('email', '==', submittedEmail));
    unsubRef.current = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setMyMessages(msgs);
    });

    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [submittedEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) { alert('Please fill all fields'); return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'contactMessages'), {
        name, email, message,
        reply: '',
        status: 'unread',
        createdAt: serverTimestamp(),
      });
      setSubmittedEmail(email);
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: C.bg, fontFamily: FONT.body }}
    >
      <div className="max-w-[560px] mx-auto flex flex-col gap-5">

        {/* ── Contact form card ── */}
        <div
          className="rounded-2xl px-7 py-7"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
          }}
        >
          {/* Card header */}
          <div className="text-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-[14px]"
              style={{
                background: "rgba(26,135,225,0.1)",
                border: `1px solid ${C.border}`,
              }}
            >
              <Mail size={20} color={C.accent} />
            </div>
            <h1
              className="text-2xl font-semibold mb-[6px]"
              
            >
              Contact Us
            </h1>
            <p className="text-[13px]" style={{ color: C.textMuted }}>
              Send us a message and our pharmacist will reply shortly.
            </p>
          </div>

          {/* Success banner */}
          {sent && (
            <div
              className="flex items-center gap-2 rounded-lg px-[14px] py-[10px] mb-[18px]"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <CheckCircle size={15} color="#059669" />
              <span className="text-[13px] font-medium" style={{ color: "#059669" }}>
                Message sent! We'll get back to you soon.
              </span>
            </div>
          )}

          {/* Contact form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
                fontFamily: FONT.body,
              }}
              required
            />
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
                fontFamily: FONT.body,
              }}
              required
            />
            <textarea
              placeholder="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border h-[120px] resize-none"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.textPrimary,
                fontFamily: FONT.body,
              }}
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="flex items-center justify-center gap-[7px] text-white border-none rounded-[9px] py-3 text-[14px] font-semibold"
              style={{
                background: sending ? "rgba(26,135,225,0.4)" : C.accent,
                cursor: sending ? "not-allowed" : "pointer",
                fontFamily: FONT.body,
                boxShadow: sending ? "none" : "0 4px 12px rgba(26,135,225,0.25)",
              }}
            >
              <Send size={14} />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        {/* ── Message history ── */}
        {myMessages.length > 0 && (
          <div
            className="rounded-2xl px-7 py-6"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
            }}
          >
            <div className="flex items-center gap-2 mb-[18px]">
              <MessageSquare size={16} color={C.accent} />
              <h2 className="text-[15px] font-bold" style={{ color: C.textPrimary }}>
                Your Messages
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {myMessages.map((msg) => {
                const s = statusStyle(msg.status);
                const StatusIcon = s.icon;
                return (
                  <div
                    key={msg.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${C.border}` }}
                  >
                    {/* Customer's original message */}
                    <div className="px-4 py-[14px]" style={{ background: C.bg }}>
                      <div className="flex justify-between items-center mb-2">
                        <p
                          className="text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ color: C.textMuted }}
                        >
                          Your Message
                        </p>
                        {/* Status badge */}
                        <span
                          className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] inline-flex items-center gap-1"
                          style={{
                            background: s.bg,
                            color: s.color,
                            border: `1px solid ${s.border}`,
                          }}
                        >
                          <StatusIcon size={10} /> {s.label}
                        </span>
                      </div>
                      <p
                        className="text-[13px] leading-[1.6]"
                        style={{ color: C.textPrimary }}
                      >
                        {msg.message}
                      </p>
                    </div>

                    {/* Pharmacist reply */}
                    {msg.reply ? (
                      <div
                        className="px-4 py-[14px]"
                        style={{
                          background: "rgba(26,135,225,0.04)",
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <div className="flex items-center gap-[6px] mb-2">
                          <Pill size={12} color={C.accent} />
                          <p
                            className="text-[10px] font-bold uppercase tracking-[0.08em]"
                            style={{ color: C.accent }}
                          >
                            Pharmacist Reply
                          </p>
                        </div>
                        <p
                          className="text-[13px] leading-[1.6]"
                          style={{ color: C.textPrimary }}
                        >
                          {msg.reply}
                        </p>
                      </div>
                    ) : (
                      <div
                        className="px-4 py-3 flex items-center justify-center gap-[6px]"
                        style={{
                          background: "rgba(245,158,11,0.04)",
                          borderTop: "1px solid rgba(245,158,11,0.2)",
                        }}
                      >
                        <Clock size={12} color="#d97706" />
                        <p className="text-[12px] font-medium" style={{ color: "#d97706" }}>
                          Waiting for pharmacist reply...
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}