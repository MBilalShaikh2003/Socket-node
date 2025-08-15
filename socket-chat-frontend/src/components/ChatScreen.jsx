"use client";

import { useEffect, useState, useRef } from "react";
import { socket } from "../utils/socket";

export default function ChatScreen() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Socket connection management
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err) => {
      setConnectionError("Connection error. Please refresh the page.");
      console.error("Connection error:", err);
    };

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onHistory = (history) => {
      setMessages(history || []);
    };

    const onUserList = (list) => {
      setUsers(list || []);
    };

    // Connect and set up event listeners
    socket.connect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chat message", onMessage);
    socket.on("chat history", onHistory);
    socket.on("user list", onUserList);

    // Cleanup on unmount
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chat message", onMessage);
      socket.off("chat history", onHistory);
      socket.off("user list", onUserList);
      socket.disconnect();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join a room
  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      socket.emit("join room", { username, room });
      setJoined(true);
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (message.trim() !== "" && isConnected) {
      socket.emit("chat message", { message });
      setMessage("");
    }
  };

  // Handle Enter key for sending messages
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  // Leave room
  const leaveRoom = () => {
    setJoined(false);
    setUsername("");
    setRoom("");
    setMessages([]);
    setUsers([]);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      {connectionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {connectionError}
        </div>
      )}

      {!joined ? (
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4">Join Chat</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border rounded w-full py-2 px-3 text-gray-700"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Room
            </label>
            <input
              type="text"
              placeholder="Enter room name"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="border rounded w-full py-2 px-3 text-gray-700"
            />
          </div>
          <button
            onClick={joinRoom}
            disabled={!username.trim() || !room.trim()}
            className={`w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
              (!username.trim() || !room.trim()) && "opacity-50 cursor-not-allowed"
            }`}
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="bg-white p-6 rounded shadow-md w-full max-w-lg flex flex-col h-[80vh]">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <div>
              <h3 className="font-bold">Room: {room}</h3>
              <p className="text-sm text-gray-500">
                Status: {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm">
                Users: {users.map((u) => u.username).join(", ")}
              </div>
              <button
                onClick={leaveRoom}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Leave Room
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto border-b pb-2 mb-2 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded ${
                    msg.user === "Server"
                      ? "bg-yellow-50"
                      : msg.user === username
                      ? "bg-blue-50 ml-4"
                      : "bg-gray-50 mr-4"
                  }`}
                >
                  <div className="flex justify-between items-baseline">
                    <span
                      className={`font-bold ${
                        msg.user === username ? "text-blue-600" : "text-gray-800"
                      }`}
                    >
                      {msg.user}
                    </span>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <p className="mt-1">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex mt-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="border rounded-l w-full py-2 px-3 text-gray-700"
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || !isConnected}
              className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-r ${
                (!message.trim() || !isConnected) &&
                "opacity-50 cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import { socket } from "../utils/socket"; // Use your socket instance

// export default function ChatScreen() {
//   const [username, setUsername] = useState("");
//   const [room, setRoom] = useState("");
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [joined, setJoined] = useState(false);
//   const [users, setUsers] = useState([]);

//   // Listen to server events
//   useEffect(() => {
//     socket.on("chat message", (msg) => {
//       setMessages((prev) => [...prev, msg]);
//     });

//     socket.on("chat history", (history) => {
//       setMessages(history);
//     });

//     socket.on("user list", (list) => {
//       setUsers(list);
//     });

//     return () => {
//       socket.off("chat message");
//       socket.off("chat history");
//       socket.off("user list");
//     };
//   }, []);

//   // Send chat message
//   const sendMessage = () => {
//     if (message.trim() !== "") {
//       socket.emit("chat message", { message });
//       setMessage("");
//     }
//   };

//   // Join a room
//   const joinRoom = () => {
//     if (username.trim() && room.trim()) {
//       socket.emit("join room", { username, room });
//       setJoined(true);
//     }
//   };

//   return (
//     <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
//       {!joined ? (
//         <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
//           <h2 className="text-xl font-bold mb-4">Join Chat</h2>
//           <input
//             type="text"
//             placeholder="Username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             className="border p-2 w-full mb-3"
//           />
//           <input
//             type="text"
//             placeholder="Room"
//             value={room}
//             onChange={(e) => setRoom(e.target.value)}
//             className="border p-2 w-full mb-3"
//           />
//           <button
//             onClick={joinRoom}
//             className="bg-blue-500 text-white p-2 w-full rounded"
//           >
//             Join Room
//           </button>
//         </div>
//       ) : (
//         <div className="bg-white p-6 rounded shadow-md w-full max-w-lg flex flex-col h-[80vh]">
//           <div className="flex justify-between border-b pb-2 mb-2">
//             <h3 className="font-bold">Room: {room}</h3>
//             <div>Users: {users.map((u) => u.username).join(", ")}</div>
//           </div>

//           <div className="flex-1 overflow-y-auto border-b pb-2 mb-2">
//             {messages.map((msg, idx) => (
//               <div key={idx} className="mb-2">
//                 <span className="font-bold">{msg.user}:</span>{" "}
//                 <span>{msg.message}</span>{" "}
//                 <span className="text-gray-400 text-sm">{msg.time}</span>
//               </div>
//             ))}
//           </div>

//           <div className="flex">
//             <input
//               type="text"
//               placeholder="Type a message..."
//               value={message}
//               onChange={(e) => setMessage(e.target.value)}
//               className="border p-2 flex-1 rounded-l"
//             />
//             <button
//               onClick={sendMessage}
//               className="bg-green-500 text-white p-2 rounded-r"
//             >
//               Send
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
