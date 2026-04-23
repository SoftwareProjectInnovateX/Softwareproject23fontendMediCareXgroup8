import { useState } from "react";
import ChatBot from "./ChatBot";

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">

      {/* Chat window — only shows when isOpen is true */}
      {isOpen && (
        <div className="mb-4 w-96 h-[560px] shadow-2xl rounded-xl overflow-hidden
                        border border-slate-200 animate-fade-in">
          <ChatBot onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#0b5ed7] hover:bg-[#084298] text-white
                   rounded-full shadow-lg flex items-center justify-center
                   transition-all duration-200 hover:scale-110 border-none
                   cursor-pointer ml-auto"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}