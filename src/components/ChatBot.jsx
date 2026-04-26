import { useState, useRef, useEffect } from "react";
import API_BASE_URL from "../config/api";
import { auth } from "../services/firebase";

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatMessages");
      return saved
        ? JSON.parse(saved)
        : [
            {
              role: "bot",
              text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
            },
          ];
    } catch {
      return [
        {
          role: "bot",
          text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
        },
      ];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  }, [messages]);

  const getFirebaseToken = async () => {
    try {
      if (auth.currentUser) return await auth.currentUser.getIdToken();
      return null;
    } catch {
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const updatedMessages = [...messages, { role: "user", text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const history = updatedMessages
        .slice(1) // skip welcome message
        .slice(0, -1) // skip current message
        .map((msg) => ({ role: msg.role, text: msg.text }));

      const token = await getFirebaseToken();

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, I couldn't connect. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-xl shadow-sm overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--navbar-border)",
      }}
    >
      {/* Header */}
      <div className="bg-[#0b5ed7] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <img
            src="/src/assets/logo.png"
            alt="MediCareX"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Health Assistant</p>
          <p className="text-blue-200 text-xs">WHO Guidelines Only</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-blue-200 text-xs">Online</span>
          </div>

          {/* Clear chat button */}
          <button
            onClick={() => {
              localStorage.removeItem("chatMessages");
              setMessages([
                {
                  role: "bot",
                  text: "Hello! I'm the MediCareX Health Assistant. I answer general health questions based on WHO guidelines.\n\nHow can I help you today?\n\n⚕️ General health information only — not a substitute for professional medical advice.",
                },
              ]);
            }}
            className="text-white hover:text-blue-200 bg-transparent border-none cursor-pointer text-xs"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 ml-2 bg-transparent border-none cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: "var(--bg-primary)" }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "bot" && (
              <div
                className="w-7 h-7 bg-blue-100 rounded-full flex items-center
                              justify-center mr-2 flex-shrink-0 mt-1 "
              >
                <span className="text-[#0b5ed7] text-xs font-bold">+</span>
              </div>
            )}
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm
                             whitespace-pre-wrap leading-relaxed shadow-sm
                             ${
                               msg.role === "user"
                                 ? "bg-[#0b5ed7] text-white rounded-br-none"
                                 : "rounded-bl-none"
                             }`}
              style={{
                background: msg.role === "user" ? "#0b5ed7" : "var(--bg-secondary)",
                color: msg.role === "user" ? "white" : "var(--text-primary)",
                border: msg.role === "user" ? "none" : "1px solid var(--navbar-border)",
              }}
            >
              {msg.role === "bot" && msg.text.includes("⚕️") ? (
                <>
                  <span>{msg.text.replace(/⚕️.*$/, "")}</span>
                  <p
                    className="mt-2 text-[10px] italic border-t pt-1"
                    style={{ color: "var(--text-secondary)", borderColor: "var(--navbar-border)" }}
                  >
                    ⚕️ This is general health information only. It is not a
                    substitute for professional medical advice.
                  </p>
                </>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 bg-blue-100 rounded-full flex items-center
                            justify-center mr-2 flex-shrink-0"
            >
              <span className="text-[#0b5ed7] text-xs font-bold">+</span>
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-none shadow-sm"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--navbar-border)" }}
            >
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="p-3 border-t"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--navbar-border)" }}
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms..."
            rows={1}
            className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm resize-none focus:outline-none transition-all"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              borderColor: "var(--navbar-border)",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-[#0b5ed7] hover:bg-[#084298] disabled:bg-blue-300
                       text-white rounded-xl transition-all border-none cursor-pointer"
          >
            <svg
              className="w-4 h-4 rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: "var(--text-secondary)" }}>
          For emergencies, call your local emergency number immediately
        </p>
      </div>
    </div>
  );
}
