'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, serverTimestamp,
  query, where, onSnapshot
} from 'firebase/firestore';
import { 
  Send, Mail, CheckCircle, MailOpen, Clock, 
  Pill, MessageSquare, Image, Mic, XCircle, Trash2 
} from 'lucide-react';

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

  // Multimedia States
  const [customerImage, setCustomerImage] = useState(null);
  const [customerVoice, setCustomerVoice] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  // Multimedia Logic
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCustomerImage(reader.result);
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
        reader.onloadend = () => setCustomerVoice(reader.result);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) { console.error("Mic access denied", err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || (!message && !customerImage && !customerVoice)) { alert('Please fill all fields'); return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'contactMessages'), {
        name, email, message,
        customerImage,
        customerVoice,
        reply: '',
        status: 'unread',
        createdAt: serverTimestamp(),
      });
      setSubmittedEmail(email);
      setSent(true);
      setMessage('');
      setCustomerImage(null);
      setCustomerVoice(null);
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
            <h1 className="text-2xl font-semibold mb-[6px]">Contact Us</h1>
            <p className="text-[13px]" style={{ color: C.textMuted }}>
              Send us a message and our pharmacist will reply shortly.
            </p>
          </div>

          {/* Success banner */}
          {sent && (
            <div className="flex items-center gap-2 rounded-lg px-[14px] py-[10px] mb-[18px]" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <CheckCircle size={15} color="#059669" />
              <span className="text-[13px] font-medium" style={{ color: "#059669" }}>Message sent! We'll get back to you soon.</span>
            </div>
          )}

          {/* Contact form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-3">
               <input
                 type="text" placeholder="Your Name" value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="flex-1 rounded-lg px-[14px] py-[10px] text-[13px] outline-none border border-[rgba(26,135,225,0.18)]"
                 required
               />
               <input
                 type="email" placeholder="Your Email" value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="flex-1 rounded-lg px-[14px] py-[10px] text-[13px] outline-none border border-[rgba(26,135,225,0.18)]"
                 required
               />
            </div>

            <div className="relative">
               <textarea
                 placeholder="Your Message" value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 className="w-full rounded-lg px-[14px] py-[10px] text-[13px] outline-none border border-[rgba(26,135,225,0.18)] h-[120px] resize-none"
               />
               <div className="absolute bottom-3 right-3 flex gap-2">
                  <button type="button" onClick={() => document.getElementById('cust-img').click()} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-500 shadow-sm"><Image size={14} /></button>
                  <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-2 rounded-lg border shadow-sm ${isRecording ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-white text-slate-500 border-slate-200'}`}><Mic size={14} /></button>
               </div>
               <input type="file" id="cust-img" className="hidden" accept="image/*" onChange={handleImageSelect} />
            </div>

            {/* Multimedia Previews */}
            {(customerImage || customerVoice) && (
              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                {customerImage && (
                  <div className="relative group">
                    <img src={customerImage} className="w-16 h-16 rounded-lg object-cover border border-white shadow-sm" alt="Preview" />
                    <button type="button" onClick={() => setCustomerImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XCircle size={10} /></button>
                  </div>
                )}
                {customerVoice && (
                  <div className="flex-1 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Voice Ready</span>
                    <button type="button" onClick={() => setCustomerVoice(null)} className="ml-auto text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit" disabled={sending}
              className="flex items-center justify-center gap-[7px] text-white border-none rounded-[9px] py-3 text-[14px] font-bold shadow-lg"
              style={{ background: sending ? "rgba(26,135,225,0.4)" : C.accent }}
            >
              <Send size={14} /> {sending ? "Sending..." : "Send Message"}
            </button>
            {isRecording && <p className="text-center text-[10px] font-black text-red-500 animate-pulse uppercase tracking-widest">Recording Voice Message...</p>}
          </form>
        </div>

        {/* ── Message history ── */}
        {myMessages.length > 0 && (
          <div className="rounded-2xl px-7 py-6 bg-white border border-[rgba(26,135,225,0.18)] shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare size={16} color={C.accent} />
              <h2 className="text-[15px] font-bold" style={{ color: C.textPrimary }}>Your Conversations</h2>
            </div>

            <div className="flex flex-col gap-4">
              {myMessages.map((msg) => {
                const s = statusStyle(msg.status);
                const StatusIcon = s.icon;
                return (
                  <div key={msg.id} className="rounded-2xl overflow-hidden border border-[rgba(26,135,225,0.12)] shadow-sm">
                    {/* Customer's original message */}
                    <div className="px-5 py-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Inquiry</p>
                        <span className="text-[10px] font-bold px-[10px] py-[3px] rounded-full uppercase tracking-widest inline-flex items-center gap-1" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}><StatusIcon size={10} /> {s.label}</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-slate-700">{msg.message}</p>
                      
                      {/* Customer Multimedia History */}
                      {(msg.customerImage || msg.customerVoice) && (
                        <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-slate-200/50">
                          {msg.customerImage && <img src={msg.customerImage} className="max-w-full rounded-xl border-2 border-white shadow-sm" alt="Your attachment" />}
                          {msg.customerVoice && <audio controls src={msg.customerVoice} className="w-full h-8" />}
                        </div>
                      )}
                    </div>

                    {/* Pharmacist reply */}
                    {msg.reply ? (
                      <div className="px-5 py-4 bg-blue-50/30 border-t border-[rgba(26,135,225,0.08)]">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-3 rounded-full bg-blue-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Pharmacist Feedback</p>
                        </div>
                        <p className="text-[13px] leading-relaxed text-slate-800">{msg.reply}</p>
                        
                        {/* Pharmacist Multimedia History */}
                        {(msg.replyImage || msg.replyVoice) && (
                          <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-blue-200/20">
                            {msg.replyImage && <img src={msg.replyImage} className="max-w-full rounded-xl border-2 border-white shadow-sm" alt="Pharmacist attachment" />}
                            {msg.replyVoice && <audio controls src={msg.replyVoice} className="w-full h-8" />}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-5 py-3 bg-amber-50/20 border-t border-amber-100 flex items-center justify-center gap-2 text-amber-600">
                        <Clock size={12} className="animate-spin" />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Consultation in Progress...</p>
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