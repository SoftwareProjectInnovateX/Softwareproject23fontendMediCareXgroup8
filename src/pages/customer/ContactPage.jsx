'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Mail, CheckCircle, MailOpen, Clock, Pill, MessageSquare, Search, History, ChevronDown, ChevronUp } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { C, FONT } from '../../components/profile/profileTheme';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

// Base URL for all API calls — falls back to localhost in development
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Firebase initialization — reuses existing app instance if already initialized
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);


// Returns background, text color, border color, icon, and label for each message status
function statusStyle(status) {
  if (status === 'replied') return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)", icon: CheckCircle, label: "Replied" };
  if (status === 'read')    return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)", icon: MailOpen,    label: "Read"    };
  return                           { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)", icon: Clock,       label: "Pending" };
}

// Safe localStorage wrapper — silently fails if storage is unavailable
const storage = {
  get: (k)    => { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set: (k, v) => { try { localStorage.setItem(k, v); }           catch {} },
  del: (k)    => { try { localStorage.removeItem(k); }           catch {} },
};

export default function ContactPage() {
  // Contact form fields
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  // Current session message tracking
  const [myMessages, setMyMessages]   = useState([]);
  const [activeEmail, setActiveEmail] = useState('');
  const [checkEmail, setCheckEmail]   = useState('');
  const [checking, setChecking]       = useState(false);

  // Past messages panel state
  const [showPastPanel, setShowPastPanel]   = useState(false);
  const [pastEmail, setPastEmail]           = useState('');
  const [pastMessages, setPastMessages]     = useState([]);
  const [pastChecking, setPastChecking]     = useState(false);
  const [pastError, setPastError]           = useState('');

  // Refs to hold Firestore unsubscribe functions so we can clean up listeners
  const pastUnsubRef = useRef(null);
  const unsubRef     = useRef(null);

  // Sets up a real-time Firestore listener filtered by the customer's email
  const subscribeToMessages = (emailAddr) => {
    // Cancel any existing listener before creating a new one
    if (unsubRef.current) unsubRef.current();
    const q = query(
      collection(db, 'contactMessages'),
      where('email', '==', emailAddr)
    );
    unsubRef.current = onSnapshot(q, (snapshot) => {
      // Sort messages newest-first using Firestore timestamp seconds
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setMyMessages(msgs);
    });
  };

  // On mount, restore saved email from localStorage and re-subscribe to messages
  useEffect(() => {
    const saved = storage.get('contact_email');
    if (saved) {
      setActiveEmail(saved);
      setCheckEmail(saved);
      subscribeToMessages(saved);
    }
    // Cleanup Firestore listener on unmount
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // Sends a new contact message to the backend, then subscribes to its updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) { alert('Please fill all fields'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error('Failed to send');
      // Persist email so the customer can see replies after page refresh
      storage.set('contact_email', email);
      setActiveEmail(email);
      subscribeToMessages(email);
      setSent(true);
      setMessage('');
      // Auto-hide the success banner after 4 seconds
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Manually checks messages for a typed email and saves it to localStorage
  const handleCheck = () => {
    if (!checkEmail.trim()) return;
    setChecking(true);
    storage.set('contact_email', checkEmail.trim());
    setActiveEmail(checkEmail.trim());
    subscribeToMessages(checkEmail.trim());
    setTimeout(() => setChecking(false), 800);
  };

  // Clears the active session — unsubscribes listener and removes saved email
  const handleClear = () => {
    if (unsubRef.current) unsubRef.current();
    setActiveEmail('');
    setMyMessages([]);
    setCheckEmail('');
    storage.del('contact_email');
  };

  // Toggles the past messages panel and resets its state on close
  const handleTogglePastPanel = () => {
    setShowPastPanel(prev => !prev);
    setPastMessages([]);
    setPastEmail('');
    setPastError('');
    if (pastUnsubRef.current) pastUnsubRef.current();
  };

  // Searches Firestore for past messages matching the entered email
  const handleCheckPast = () => {
    if (!pastEmail.trim()) return;
    setPastChecking(true);
    setPastError('');
    setPastMessages([]);
    // Cancel any existing past-messages listener before starting a new one
    if (pastUnsubRef.current) pastUnsubRef.current();

    const q = query(
      collection(db, 'contactMessages'),
      where('email', '==', pastEmail.trim())
    );

    pastUnsubRef.current = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      if (msgs.length === 0) setPastError('No messages found for this email.');
      setPastMessages(msgs);
      setPastChecking(false);
    }, () => {
      setPastError('Failed to fetch messages.');
      setPastChecking(false);
    });
  };

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: C.bg, fontFamily: FONT.body }}>
      <div className="max-w-[560px] mx-auto flex flex-col gap-5">

        {/* Contact form card */}
        <div className="rounded-2xl px-7 py-7"
          style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-[14px]"
              style={{ background: "rgba(26,135,225,0.1)", border: `1px solid ${C.border}` }}>
              <Mail size={20} color={C.accent} />
            </div>
            <h1 className="text-2xl font-semibold mb-[6px]">Contact Us</h1>
            <p className="text-[13px]" style={{ color: C.textMuted }}>
              Send us a message and our pharmacist will reply shortly.
            </p>
          </div>

          {/* Success banner — auto-hides after 4 seconds */}
          {sent && (
            <div className="flex items-center gap-2 rounded-lg px-[14px] py-[10px] mb-[18px]"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <CheckCircle size={15} color="#059669" />
              <span className="text-[13px] font-medium" style={{ color: "#059669" }}>
                Message sent! We'll get back to you soon.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="text" placeholder="Your Name" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body }}
              required />
            <input type="email" placeholder="Your Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body }}
              required />
            <textarea placeholder="Your Message" value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border h-[120px] resize-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body }}
              required />
            {/* Submit button — disabled while request is in flight */}
            <button type="submit" disabled={sending}
              className="flex items-center justify-center gap-[7px] text-white border-none rounded-[9px] py-3 text-[14px] font-semibold"
              style={{
                background: sending ? "rgba(26,135,225,0.4)" : C.accent,
                cursor:     sending ? "not-allowed" : "pointer",
                fontFamily: FONT.body,
                boxShadow:  sending ? "none" : "0 4px 12px rgba(26,135,225,0.25)",
              }}>
              <Send size={14} />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>

          {/* Toggle button to show or hide the past messages panel */}
          <button
            onClick={handleTogglePastPanel}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-[9px] py-[10px] text-[13px] font-semibold border transition-all"
            style={{
              background: "transparent",
              border:     `1px solid ${C.border}`,
              color:      C.accent,
              cursor:     "pointer",
              fontFamily: FONT.body,
            }}>
            <History size={14} />
            {showPastPanel ? "Hide Past Messages" : "View My Past Messages"}
            {showPastPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Past Messages Panel — only rendered when showPastPanel is true */}
        {showPastPanel && (
          <div className="rounded-2xl px-7 py-6"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}>
            <div className="flex items-center gap-2 mb-4">
              <History size={15} color={C.accent} />
              <h2 className="text-[14px] font-bold" style={{ color: C.textPrimary }}>Check Past Messages</h2>
            </div>
            <p className="text-[12px] mb-3" style={{ color: C.textMuted }}>
              Enter the email you used when sending your message.
            </p>
            <div className="flex gap-2 mb-3">
              <input type="email" placeholder="Enter your email" value={pastEmail}
                onChange={(e) => { setPastEmail(e.target.value); setPastError(''); }}
                className="flex-1 rounded-lg px-[14px] py-[10px] text-[13px] outline-none box-border"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body }} />
              {/* Search button — disabled while fetching or if email is empty */}
              <button onClick={handleCheckPast} disabled={pastChecking || !pastEmail.trim()}
                className="flex items-center gap-[6px] text-white border-none rounded-[9px] px-4 py-[10px] text-[13px] font-semibold"
                style={{
                  background: pastChecking || !pastEmail.trim() ? "rgba(26,135,225,0.4)" : C.accent,
                  cursor:     pastChecking || !pastEmail.trim() ? "not-allowed" : "pointer",
                  fontFamily: FONT.body,
                }}>
                <Search size={13} />
                {pastChecking ? "..." : "Search"}
              </button>
            </div>

            {/* Error message when no results are found or fetch fails */}
            {pastError && (
              <p className="text-[12px] text-center py-2" style={{ color: "#d97706" }}>{pastError}</p>
            )}

            {/* List of past messages with status badge and pharmacist reply */}
            {pastMessages.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                {pastMessages.map((msg) => {
                  const s = statusStyle(msg.status);
                  const StatusIcon = s.icon;
                  return (
                    <div key={msg.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                      <div className="px-4 py-[14px]" style={{ background: C.bg }}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>
                            Your Message
                          </p>
                          <span className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] inline-flex items-center gap-1"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            <StatusIcon size={10} /> {s.label}
                          </span>
                        </div>
                        <p className="text-[13px] leading-[1.6]" style={{ color: C.textPrimary }}>{msg.message}</p>
                      </div>

                      {/* Show pharmacist reply if available, otherwise show waiting state */}
                      {msg.reply ? (
                        <div className="px-4 py-[14px]"
                          style={{ background: "rgba(26,135,225,0.04)", borderTop: `1px solid ${C.border}` }}>
                          <div className="flex items-center gap-[6px] mb-2">
                            <Pill size={12} color={C.accent} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: C.accent }}>
                              Pharmacist Reply
                            </p>
                          </div>
                          <p className="text-[13px] leading-[1.6]" style={{ color: C.textPrimary }}>{msg.reply}</p>
                        </div>
                      ) : (
                        <div className="px-4 py-3 flex items-center justify-center gap-[6px]"
                          style={{ background: "rgba(245,158,11,0.04)", borderTop: "1px solid rgba(245,158,11,0.2)" }}>
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
            )}
          </div>
        )}

        {/* Current session messages — only shown when past panel is open and messages exist */}
        {myMessages.length > 0 && showPastPanel && (
          <div className="rounded-2xl px-7 py-6"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}>
            <div className="flex items-center justify-between mb-[18px]">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} color={C.accent} />
                <h2 className="text-[15px] font-bold" style={{ color: C.textPrimary }}>Your Messages</h2>
              </div>
              {/* Clear button removes saved email and unsubscribes the listener */}
              <button onClick={handleClear}
                className="text-[11px] border-none bg-transparent cursor-pointer"
                style={{ color: C.textMuted }}>
                Clear
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {myMessages.map((msg) => {
                const s = statusStyle(msg.status);
                const StatusIcon = s.icon;
                return (
                  <div key={msg.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                    <div className="px-4 py-[14px]" style={{ background: C.bg }}>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>
                          Your Message
                        </p>
                        <span className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] inline-flex items-center gap-1"
                          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          <StatusIcon size={10} /> {s.label}
                        </span>
                      </div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: C.textPrimary }}>{msg.message}</p>
                    </div>

                    {/* Show pharmacist reply if available, otherwise show waiting state */}
                    {msg.reply ? (
                      <div className="px-4 py-[14px]"
                        style={{ background: "rgba(26,135,225,0.04)", borderTop: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-[6px] mb-2">
                          <Pill size={12} color={C.accent} />
                          <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: C.accent }}>
                            Pharmacist Reply
                          </p>
                        </div>
                        <p className="text-[13px] leading-[1.6]" style={{ color: C.textPrimary }}>{msg.reply}</p>
                      </div>
                    ) : (
                      <div className="px-4 py-3 flex items-center justify-center gap-[6px]"
                        style={{ background: "rgba(245,158,11,0.04)", borderTop: "1px solid rgba(245,158,11,0.2)" }}>
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