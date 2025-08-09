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

app.use(express.static(__dirname));

const roomUsers = {};
const chatHistory = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join room", ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room].push({ username, id: socket.id });

    if (!chatHistory[room]) chatHistory[room] = [];

    const joinMsg = {
      user: "Server",
      message: `${username} joined ${room}`,
      time: new Date().toLocaleTimeString()
    };

    chatHistory[room].push(joinMsg);
    io.to(room).emit("chat message", joinMsg);
    socket.emit("chat history", chatHistory[room]);
    io.to(room).emit("user list", roomUsers[room]);

    console.log(`[${joinMsg.time}] Server: ${username} joined ${room}`);
    console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
    console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
  });

  socket.on("chat message", (data) => {
    const msg = {
      user: socket.username,
      message: data.message,
      time: new Date().toLocaleTimeString()
    };
    chatHistory[socket.room].push(msg);
    io.to(socket.room).emit("chat message", msg);

    console.log(`[${msg.time}] ${socket.username}: ${data.message}`);
    console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
    console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
  });

  socket.on("private message", ({ toId, message }) => {
    const pm = {
      from: socket.username,
      message,
      time: new Date().toLocaleTimeString()
    };
    io.to(toId).emit("private message", pm);

    console.log(`[${pm.time}] PM from ${socket.username} to ${toId}: ${message}`);
    console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
    console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
  });

  socket.on("disconnect", () => {
    if (socket.username && socket.room) {
      roomUsers[socket.room] = roomUsers[socket.room].filter(
        (u) => u.id !== socket.id
      );

      const leaveMsg = {
        user: "Server",
        message: `${socket.username} left ${socket.room}`,
        time: new Date().toLocaleTimeString()
      };

      chatHistory[socket.room].push(leaveMsg);
      io.to(socket.room).emit("chat message", leaveMsg);
      io.to(socket.room).emit("user list", roomUsers[socket.room]);

      console.log(`[${leaveMsg.time}] Server: ${socket.username} left ${socket.room}`);
      console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
      console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
    }
  });
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});


