const Message = require("../models/message.models.js");
const { User } = require("../models/user.model.js");

const onlineUsers = new Map();

const handleSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    // Add User to online users
    socket.on("addUser", async (userId) => {
      if (!userId) return;

      onlineUsers.set(userId, socket.id);
      console.log("👤 User added to online users:", userId);

      // Emit online users list to all clients
      const onlineUserIds = Array.from(onlineUsers.keys());
      io.emit("getOnlineUsers", onlineUserIds);
    });

    // Get chat users (users with whom current user has chatted)
    socket.on("getChatUsers", async (currentUserId) => {
      try {
        if (!currentUserId) return;

        // Find all messages where current user is sender or receiver
        const messages = await Message.find({
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        })
          .sort({ createdAt: -1 })
          .populate("sender receiver", "fullName email updatedAt");

        const chatMap = new Map();

        messages.forEach((msg) => {
          const otherUser =
            msg.sender._id.toString() === currentUserId
              ? msg.receiver
              : msg.sender;

          const otherUserId = otherUser._id.toString();

          if (!chatMap.has(otherUserId)) {
            chatMap.set(otherUserId, {
              userId: otherUser._id,
              fullName: otherUser.fullName,
              email: otherUser.email,
              lastMessage:
                msg.text ||
                (msg.image && msg.image.length > 0 ? "📷 Image" : ""),
              lastSeen: otherUser.updatedAt,
              lastTime: msg.createdAt,
              online: onlineUsers.has(otherUserId),
            });
          }
        });

        const chatUsers = Array.from(chatMap.values());
        socket.emit("chatUsersList", chatUsers);
      } catch (error) {
        console.error("❌ Failed to fetch chat users:", error);
        socket.emit("chatUsersList", []);
      }
    });

    // Get messages between two users
    socket.on("getMessages", async ({ currentUserId, selectedUserId }) => {
      try {
        if (!currentUserId || !selectedUserId) return;

        const messages = await Message.find({
          $or: [
            { sender: currentUserId, receiver: selectedUserId },
            { sender: selectedUserId, receiver: currentUserId },
          ],
        })
          .sort({ createdAt: 1 })
          .populate("sender receiver", "fullName email");

        socket.emit("messagesList", messages);
      } catch (error) {
        console.error("❌ Failed to fetch messages:", error);
        socket.emit("messagesList", []);
      }
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
            text: text || "",
            image: imagePaths,
          });

          // Populate sender and receiver details
          await message.populate("sender receiver", "fullName email");

          // Send to receiver if online
          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", message);
          }

          // Send back to sender
          socket.emit("receiveMessage", message);

          // Update chat users list for both users
          socket.emit("getChatUsers", senderId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("getChatUsers", receiverId);
          }
        } catch (error) {
          console.log("❌ Socket Send Message Error:", error.message);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Update Message
    socket.on(
      "updateMessage",
      async ({ messageId, newText, currentUserId, selectedUserId }) => {
        try {
          const updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
              text: newText,
              edited: true,
              editedAt: new Date(),
            },
            { new: true }
          ).populate("sender receiver", "fullName email");

          if (!updatedMessage) {
            return socket.emit("error", { message: "Message not found" });
          }

          // Emit to all users in the chat
          io.emit("messageUpdated", updatedMessage);

          // Update chat users list for both users
          socket.emit("getChatUsers", currentUserId);
          const receiverSocketId = onlineUsers.get(selectedUserId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("getChatUsers", selectedUserId);
          }
        } catch (err) {
          console.error("❌ Update Message Error:", err.message);
          socket.emit("error", { message: "Failed to update message" });
        }
      }
    );

    // Delete Message
    socket.on(
      "deleteMessage",
      async ({ messageId, currentUserId, selectedUserId }) => {
        try {
          const deleted = await Message.findByIdAndDelete(messageId);

          if (!deleted) {
            return socket.emit("error", { message: "Message not found" });
          }

          // Emit to all users in the chat
          io.emit("messageDeleted", { messageId });

          // Update chat users list for both users
          socket.emit("getChatUsers", currentUserId);
          const receiverSocketId = onlineUsers.get(selectedUserId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("getChatUsers", selectedUserId);
          }
        } catch (err) {
          console.log("❌ Delete Message Error:", err.message);
          socket.emit("error", { message: "Failed to delete message" });
        }
      }
    );

    // Disconnect
    socket.on("disconnect", () => {
      let disconnectedUserId = null;

      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        console.log("🔴 User disconnected:", disconnectedUserId);
        // Emit updated online users list
        const onlineUserIds = Array.from(onlineUsers.keys());
        io.emit("getOnlineUsers", onlineUserIds);
      }
    });
  });
};

module.exports = handleSocket;
