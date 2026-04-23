import { useState } from "react";
import api from "../api/axios"; // 🟢 Uses centralized API

export default function Chatbot() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { bot: "Hi 👋 I’m your AI assistant for Jan Samadhan. How can I help you today?" }
  ]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userInput = message;

    // Add user message immediately
    setChat((prev) => [...prev, { user: userInput }]);

    // Clear input instantly
    setMessage("");

    // Show typing indicator
    setLoading(true);
    setChat((prev) => [...prev, { bot: "Typing..." }]);

    try {
      const form = new FormData();
      form.append("message", userInput);

      // 🟢 Automatic token injection via interceptor
      const res = await api.post("/chat", form);

      // Replace "Typing..." with actual response
      setChat((prev) => [
        ...prev.slice(0, -1),
        { bot: res.data.response }
      ]);

    } catch (err) {
      setChat((prev) => [
        ...prev.slice(0, -1),
        { bot: "⚠️ AI service unavailable. Please try again." }
      ]);
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50"
      >
        💬
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-[450px] bg-white shadow-2xl rounded-xl flex flex-col z-50">

          {/* Header */}
          <div className="bg-blue-600 text-white p-3 rounded-t-xl font-semibold flex justify-between items-center">
            AI Assistant
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
            {chat.map((c, i) => (
              <div key={i} className="flex flex-col">
                {c.user && (
                  <div className="self-end bg-blue-100 px-3 py-2 rounded-lg max-w-[75%] text-right">
                    {c.user}
                  </div>
                )}
                {c.bot && (
                  <div className="self-start bg-gray-200 px-3 py-2 rounded-lg max-w-[75%]">
                    {c.bot}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-2 border-t flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}