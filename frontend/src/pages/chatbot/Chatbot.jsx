import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, User, RotateCcw, ChevronDown, Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 500;

const SUGGESTED_PROMPTS = [
  "How is my overall health?",
  "My BP is high, what should I do?",
  "Tips for weight loss",
  "What does my sugar level mean?",
  "How can I improve my BMI?",
];

const WELCOME_MESSAGE = {
  role: "assistant",
  text: "Ask me a health question. I'll give short, safe guidance based on your profile and recent health data.",
  timestamp: new Date(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (date) =>
  date instanceof Date
    ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";

/**
 * Lightweight markdown renderer — supports **bold**, *italic*, and
 * lines starting with "- " or "• " as bullet points.
 * Returns an array of React elements.
 */
const renderText = (text) => {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const isBullet = /^[-•]\s/.test(line.trimStart());
    const content = isBullet ? line.replace(/^[-•]\s/, "") : line;

    // Bold (**text**) and italic (*text*)
    const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, pi) => {
      if (/^\*\*[^*]+\*\*$/.test(part))
        return <strong key={pi}>{part.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(part))
        return <em key={pi}>{part.slice(1, -1)}</em>;
      return part;
    });

    if (isBullet) {
      return (
        <li key={li} className="ml-3 flex items-start gap-1.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
          <span>{parts}</span>
        </li>
      );
    }
    return (
      <span key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
    </div>
  </div>
);

const MessageBubble = ({ item }) => {
  const isUser = item.role === "user";
  const hasBullets = item.text.split("\n").some((l) => /^[-•]\s/.test(l.trimStart()));

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Bot size={14} className="text-blue-600" />
        </div>
      )}

      <div className="flex max-w-[88%] flex-col gap-1 md:max-w-[78%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
            isUser
              ? "rounded-tr-sm bg-blue-600 text-white"
              : "rounded-tl-sm bg-gray-100 text-gray-700"
          }`}
        >
          {hasBullets ? (
            <ul className="space-y-1">{renderText(item.text)}</ul>
          ) : (
            <p className="whitespace-pre-line">{renderText(item.text)}</p>
          )}
        </div>
        {/* Timestamp */}
        {item.timestamp && (
          <p className={`text-[10px] text-gray-400 ${isUser ? "text-right" : "text-left"}`}>
            {formatTime(item.timestamp)}
          </p>
        )}
      </div>

      {/* Avatar */}
      {isUser && (
        <div className="ml-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600">
          <User size={14} className="text-white" />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Whether conversation has started (more than just the welcome message)
  const conversationStarted = messages.length > 1;

  // ── Auto-scroll to bottom when messages change ──
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // ── Show/hide scroll-to-bottom button ──
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 120);
  };

  // ── Send message ──
  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { message: trimmed });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.reply, timestamp: new Date() },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I couldn't answer right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset chat ──
  const handleReset = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setMessage("");
  };

  // ── Keyboard submit ──
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charsLeft = MAX_CHARS - message.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Bot size={22} className="text-blue-600" />
              AI Health Assistant
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Responses are based on your latest health data
            </p>
          </div>
          {/* Reset button — only visible once conversation starts */}
          {conversationStarted && (
            <button
              type="button"
              onClick={handleReset}
              title="Clear chat"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
            >
              <RotateCcw size={13} />
              Clear chat
            </button>
          )}
        </div>

        {/* ── Chat window ── */}
        <div className="relative flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">

          {/* Messages area */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-[55vh] space-y-4 overflow-y-auto p-4 md:h-[460px] md:p-5"
          >
            {/* Welcome banner — only when no conversation yet */}
            {!conversationStarted && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <Sparkles size={15} className="shrink-0 text-blue-500" />
                <p className="text-xs text-blue-600 leading-snug">
                  Ask me anything about your health — I can read your latest logs and give personalised guidance.
                </p>
              </div>
            )}

            {messages.map((item, i) => (
              <MessageBubble key={`${item.role}-${i}`} item={item} />
            ))}

            {loading && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll-to-bottom button */}
          {showScrollBtn && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="absolute bottom-[140px] right-4 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 md:bottom-[152px]"
            >
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          )}

          {/* ── Input area ── */}
          <div className="border-t border-gray-100 p-4">

            {/* Suggested prompts — hidden once conversation starts */}
            {!conversationStarted && (
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200 active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <textarea
                  rows={1}
                  value={message}
                  onChange={(e) => {
                    // Cap at MAX_CHARS + a small overrun for visual feedback
                    if (e.target.value.length <= MAX_CHARS + 20) {
                      setMessage(e.target.value);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Example: My sugar was high today. What should I do?"
                  style={{ resize: "none" }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {/* Character counter — show when approaching limit */}
                {message.length > MAX_CHARS * 0.7 && (
                  <span
                    className={`absolute bottom-3 right-3 text-[10px] font-semibold ${
                      isOverLimit ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    {charsLeft}
                  </span>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !message.trim() || isOverLimit}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </div>

            {/* Footer hint */}
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                General advice only — not a medical diagnosis.
              </p>
              <p className="hidden text-[10px] text-gray-300 sm:block">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;