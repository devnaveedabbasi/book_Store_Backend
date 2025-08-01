const Message = require("../models/message.models.js");

const onlineUsers = new Map();

const handleSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // Add user
    socket.on("addUser", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    });

    // Send Message
    socket.on(
      "sendMessage",
      async ({ senderId, receiverId, text, images = [] }) => {
        try {
          if (!senderId || !receiverId || (!text && images.length === 0)) {
            return socket.emit("error", {
              message: "Sender, Receiver and either Text or Image is required",
            });
          }

          const imagePaths = images.map((img) => `uploads/${img}`);

          const message = await Message.create({
            sender: senderId,
            receiver: receiverId,
            text,
            image: imagePaths,
          });

          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", message);
          }

          socket.emit("receiveMessage", message);
          io.emit("lastMessageUpdate", {
            sender: senderId,
            receiver: receiverId,
            message,
          });
        } catch (error) {
          console.log("❌ Socket Send Message Error:", error.message);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Disconnect
    socket.on("disconnect", () => {
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

module.exports = handleSocket;
