const Message = require("../models/message.models.js");
const { User } = require("../models/user.model.js");

const onlineUsers = new Map();

const handleSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // Add User
    socket.on("addUser", async (userId) => {
      onlineUsers.set(userId, socket.id);

      const userIds = Array.from(onlineUsers.keys());
      const users = await User.find({ _id: { $in: userIds } }).select(
        "fullName email _id"
      );

      io.emit("getOnlineUsers", users);
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

    // Send chat users with last message and online status
    socket.on("getChatUsers", async (userId) => {
      try {
        const messages = await Message.find({
          $or: [{ sender: userId }, { receiver: userId }],
        })
          .sort({ createdAt: -1 })
          .populate("sender receiver", "fullName email updatedAt");

        const chatMap = new Map();

        messages.forEach((msg) => {
          const otherUser =
            msg.sender._id.toString() === userId ? msg.receiver : msg.sender;

          if (!chatMap.has(otherUser._id.toString())) {
            chatMap.set(otherUser._id.toString(), {
              userId: otherUser._id,
              fullName: otherUser.fullName,
              email: otherUser.email,
              lastMessage: msg.text || "📷 Image",
              lastSeen: otherUser.updatedAt,
              lastTime: msg.createdAt,
              isOnline: onlineUsers.has(otherUser._id.toString()),
            });
          }
        });

        // Users sorted: online first, then offline
        const sortedUsers = Array.from(chatMap.values()).sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return new Date(b.lastTime) - new Date(a.lastTime);
        });

        socket.emit("chatUsersList", sortedUsers);
      } catch (err) {
        console.error("Failed to get chat users", err);
      }
    });

    // 🔄 Update Message
    socket.on("updateMessage", async ({ messageId, newText }) => {
      try {
        const updated = await Message.findByIdAndUpdate(
          messageId,
          { text: newText },
          { new: true }
        );

        io.emit("messageUpdated", updated);
      } catch (err) {
        socket.emit("error", { message: "Failed to update message" });
      }
    });

    // ❌ Delete Message
    socket.on("deleteMessage", async ({ messageId }) => {
      try {
        const deleted = await Message.findByIdAndDelete(messageId);

        if (!deleted)
          return socket.emit("error", { message: "Message not found" });

        io.emit("messageDeleted", { messageId });
      } catch (err) {
        console.log("❌ Delete Message Error:", err.message);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

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
