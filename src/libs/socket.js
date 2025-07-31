// const { Message } = require("../models/message.models.js");
// const { BookRequest } = require("../models/bookRequest.models.js");

// let onlineUsers = new Map();

// const setupSocket = (server) => {
//   const { Server } = require("socket.io");
//   const io = new Server(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("✅ Socket connected:", socket.id);

//     socket.on("setup", (userId) => {
//       onlineUsers.set(userId, socket.id);
//       socket.join(userId);
//       console.log(`User ${userId} joined personal room`);
//     });

//     socket.on(
//       "send message",
//       async ({ senderId, receiverId, bookRequestId, text }) => {
//         try {
//           const message = await Message.create({
//             sender: senderId,
//             bookRequest: bookRequestId,
//             text,
//           });

//           io.to(receiverId).emit("receive message", {
//             senderId,
//             text,
//             bookRequestId,
//             createdAt: message.createdAt,
//           });
//         } catch (err) {
//           console.error("❌ Error saving message:", err);
//         }
//       }
//     );

//     socket.on("disconnect", () => {
//       for (let [userId, id] of onlineUsers.entries()) {
//         if (id === socket.id) {
//           onlineUsers.delete(userId);
//           break;
//         }
//       }
//       console.log("❌ User disconnected");
//     });
//   });
// };

// module.exports = { setupSocket };
