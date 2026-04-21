import { useState } from "react";

export default function Chatbot() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    if (!message) return;

    const token = localStorage.getItem("token"); // assuming login stores token

    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: new URLSearchParams({ message })
    });

    const data = await res.json();

    setChat([
      ...chat,
      { user: message },
      { bot: data.response }
    ]);

    setMessage("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>AI Chatbot</h2>

      <div style={{ height: "300px", overflowY: "scroll", border: "1px solid gray", padding: "10px" }}>
        {chat.map((c, i) => (
          <div key={i}>
            {c.user && <p><b>You:</b> {c.user}</p>}
            {c.bot && <p><b>Bot:</b> {c.bot}</p>}
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
}