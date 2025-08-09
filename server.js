// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/index.html");
// });

// io.on("connection", (socket) => {
//   console.log("A user connected");

//     socket.on("join room", ({ username, room }) => {
//   socket.username = username;
//   socket.room = room;
//   socket.join(room);

//   io.to(room).emit("chat message", {
//     user: "Server",
//     message: `${socket.username} joined ${socket.room}`
//   });
// });

// socket.on("chat message", (data) => {
//     console.log(data)
//   io.to(socket.room).emit("chat message", {
//     user: socket.username,
//     message: data.message
//   });
// });

// socket.on("disconnect", () => {
//   if (socket.username && socket.room) {
//     io.to(socket.room).emit("chat message", {
//       user: "Server",
//       message: `${socket.username} left ${socket.room}`
//     });
//   }
// });

  
// });

// server.listen(3000, () => {
//   console.log("Server listening on port 3000");
// });











const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const chatHistory = {}; // Stores chat history by room

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join room", ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    // Initialize chat history if not exists
    if (!chatHistory[room]) {
      chatHistory[room] = [];
    }

    // Send chat history to the newly joined user
    socket.emit("chat history", chatHistory[room]);

    // Notify others in the room
    const joinMsg = {
      user: "Server",
      message: `${username} joined ${room}`,
      timestamp: new Date().toLocaleTimeString()
    };

    chatHistory[room].push(joinMsg);
    io.to(room).emit("chat message", joinMsg);
  });

  socket.on("chat message", (data) => {
    const room = socket.room;

    if (!chatHistory[room]) {
      chatHistory[room] = []; // Just in case
    }

    const messageData = {
      user: socket.username,
      message: data.message,
      timestamp: new Date().toLocaleTimeString()
    };

    chatHistory[room].push(messageData);
    io.to(room).emit("chat message", messageData);
  });

  socket.on("disconnect", () => {
    const room = socket.room;
    const username = socket.username;

    if (room && username) {
      const leaveMsg = {
        user: "Server",
        message: `${username} left ${room}`,
        timestamp: new Date().toLocaleTimeString()
      };

      chatHistory[room]?.push(leaveMsg);
      io.to(room).emit("chat message", leaveMsg);
    }
  });
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
