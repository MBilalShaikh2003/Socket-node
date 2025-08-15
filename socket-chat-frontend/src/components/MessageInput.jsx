"use client";
import { useState } from "react";
import { socket } from "@/utils/socket";

export default function MessageInput({ username }) {
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text.trim()) return;
    socket.emit("chat message", { user: username || "Anonymous", text });
    setText("");
  };

  return (
    <div className="flex">
      <input
        type="text"
        className="flex-1 border p-2"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button
        onClick={sendMessage}
        className="bg-blue-500 text-white px-4 py-2"
      >
        Send
      </button>
    </div>
  );
}
