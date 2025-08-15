// import { io } from "socket.io-client";

// // Change this URL to your backend server's URL
// export const socket = io("http://localhost:3000", {
//   transports: ["websocket"],
// });


import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

export const socket = io(URL, {
  autoConnect: false, // Don't connect automatically
  reconnectionAttempts: 5, // Number of reconnection attempts
  reconnectionDelay: 1000, // Delay between reconnections
  transports: ["websocket"]
});

// Handle connection events
socket.on("connect", () => {
  console.log("Connected to socket server");
});

socket.on("disconnect", () => {
  console.log("Disconnected from socket server");
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err);
});