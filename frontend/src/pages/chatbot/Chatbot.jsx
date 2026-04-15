import { useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me a health question. I will give short and safe guidance based on your profile and recent health data.",
    },
  ]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage = { role: "user", text: trimmedMessage };
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/ai/chat", { message: trimmedMessage });

      setMessages((current) => [
        ...current,
        { role: "assistant", text: response.data.reply },
      ]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I could not answer right now. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Bot size={22} className="text-blue-600" />
            AI Health Assistant
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Ask simple health questions based on your latest profile and logs
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-[480px] space-y-4 overflow-y-auto p-5">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    item.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold opacity-80">
                    {item.role === "user" ? <User size={12} /> : <Bot size={12} />}
                    {item.role === "user" ? "You" : "Assistant"}
                  </p>
                  <p className="whitespace-pre-line">{item.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder="Example: My sugar was high today. What should I do?"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />

              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              This assistant gives safe general advice only. It does not provide diagnosis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
