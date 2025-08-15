// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const cors = require("cors"); // Add this

// const app = express();
// app.use(cors()); // Enable CORS

// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3001", // Your Next.js dev server port
//     methods: ["GET", "POST"]
//   }
// });

// // ... rest of your existing server code ...
// app.use(express.static(__dirname));

// const roomUsers = {};
// const chatHistory = {};

// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/index.html");
// });

// io.on("connection", (socket) => {
//   console.log("A user connected");

//   socket.on("join room", ({ username, room }) => {
//     socket.username = username;
//     socket.room = room;
//     socket.join(room);

//     if (!roomUsers[room]) roomUsers[room] = [];
//     roomUsers[room].push({ username, id: socket.id });

//     if (!chatHistory[room]) chatHistory[room] = [];

//     const joinMsg = {
//       user: "Server",
//       message: `${username} joined ${room}`,
//       time: new Date().toLocaleTimeString()
//     };

//     chatHistory[room].push(joinMsg);
//     io.to(room).emit("chat message", joinMsg);
//     socket.emit("chat history", chatHistory[room]);
//     io.to(room).emit("user list", roomUsers[room]);

//     console.log(`[${joinMsg.time}] Server: ${username} joined ${room}`);
//     console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
//     console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
//   });

//   socket.on("chat message", (data) => {
//     const msg = {
//       user: socket.username,
//       message: data.message,
//       time: new Date().toLocaleTimeString()
//     };
//     chatHistory[socket.room].push(msg);
//     io.to(socket.room).emit("chat message", msg);

//     console.log(`[${msg.time}] ${socket.username}: ${data.message}`);
//     //console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
//     //console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
//   });

//   socket.on("private message", ({ toId, message }) => {
//     const pm = {
//       from: socket.username,
//       message,
//       time: new Date().toLocaleTimeString()
//     };
//     io.to(toId).emit("private message", pm);

//     console.log(`[${pm.time}] PM from ${socket.username} to ${toId}: ${message}`);
//     console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
//     console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
//   });

//   socket.on("disconnect", () => {
//     if (socket.username && socket.room) {
//       roomUsers[socket.room] = roomUsers[socket.room].filter(
//         (u) => u.id !== socket.id
//       );

//       const leaveMsg = {
//         user: "Server",
//         message: `${socket.username} left ${socket.room}`,
//         time: new Date().toLocaleTimeString()
//       };

//       chatHistory[socket.room].push(leaveMsg);
//       io.to(socket.room).emit("chat message", leaveMsg);
//       io.to(socket.room).emit("user list", roomUsers[socket.room]);

//       console.log(`[${leaveMsg.time}] Server: ${socket.username} left ${socket.room}`);
//     //   console.log("Current Room Users:", JSON.stringify(roomUsers, null, 2));
//     //   console.log("Current Chat History:", JSON.stringify(chatHistory, null, 2));
//      }
//   });
// });

// server.listen(3000, () => {
//   console.log("Server listening on port 3000");
// });



require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// MongoDB Connection with enhanced security
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: "majority",
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1); // Exit if DB connection fails
});

// Schemas with validation
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  user: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  users: [{
    username: { type: String, required: true },
    socketId: { type: String, required: true }
  }]
});

// Add indexes for better performance
messageSchema.index({ room: 1, createdAt: -1 });
roomSchema.index({ name: 1 });

const Message = mongoose.model("Message", messageSchema);
const Room = mongoose.model("Room", roomSchema);

// Rate limiting for socket events
const messageRateLimit = new Map();
const RATE_LIMIT = 5; // Messages per second
const RATE_LIMIT_WINDOW = 1000; // 1 second

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join room", async ({ username, room }) => {
    try {
      // Input validation
      if (!username || !room || username.length > 20 || room.length > 20) {
        throw new Error("Invalid username or room");
      }

      socket.username = username;
      socket.room = room;
      socket.join(room);

      // Atomic room update
      const roomDoc = await Room.findOneAndUpdate(
        { name: room },
        { $addToSet: { users: { username, socketId: socket.id } } },
        { upsert: true, new: true }
      );

      // Get last 100 messages with pagination
      const messages = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const joinMsg = {
        user: "Server",
        message: `${username} joined ${room}`,
        time: new Date().toLocaleTimeString(),
        room
      };

      await Message.create(joinMsg);

      // Emit events
      socket.emit("chat history", messages.reverse());
      io.to(room).emit("chat message", joinMsg);
      io.to(room).emit("user list", roomDoc.users);

    } catch (err) {
      console.error("Join room error:", err);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("chat message", async (data) => {
    try {
      // Rate limiting check
      const now = Date.now();
      const userLimit = messageRateLimit.get(socket.id) || { count: 0, last: 0 };
      
      if (now - userLimit.last < RATE_LIMIT_WINDOW) {
        if (userLimit.count >= RATE_LIMIT) {
          socket.emit("error", "Message rate limit exceeded");
          return;
        }
        userLimit.count++;
      } else {
        userLimit.count = 1;
        userLimit.last = now;
      }
      messageRateLimit.set(socket.id, userLimit);

      // Message validation
      if (!data.message || data.message.length > 500) {
        throw new Error("Invalid message");
      }

      const msg = {
        user: socket.username,
        message: data.message.trim(),
        time: new Date().toLocaleTimeString(),
        room: socket.room
      };

      await Message.create(msg);
      io.to(socket.room).emit("chat message", msg);

    } catch (err) {
      console.error("Message send error:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("disconnect", async () => {
    try {
      if (socket.username && socket.room) {
        const room = socket.room;
        
        const roomDoc = await Room.findOneAndUpdate(
          { name: room },
          { $pull: { users: { socketId: socket.id } } },
          { new: true }
        );

        if (roomDoc) {
          const leaveMsg = {
            user: "Server",
            message: `${socket.username} left ${room}`,
            time: new Date().toLocaleTimeString(),
            room
          };

          await Message.create(leaveMsg);
          io.to(room).emit("chat message", leaveMsg);
          io.to(room).emit("user list", roomDoc.users);
        }
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      messageRateLimit.delete(socket.id);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});