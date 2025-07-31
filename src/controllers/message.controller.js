const Message = require("../models/message.models.js");
const { User } = require("../models/user.model.js");
const { ApiResponse } = require("../utils/apiResponse.js");
const { ApiError } = require("../utils/apiError.js");
const mongoose = require("mongoose");

// 1️⃣ Send a Message (text or image)
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;
    const sender = req.user?._id;

    console.log("🔵 Sender ID:", sender);
    console.log("🟢 Receiver ID:", receiverId);
    console.log("✉️ Text:", text);

    if (!sender || !receiverId || (!text && !req.files?.length)) {
      return next(
        new ApiError(
          400,
          "Sender, Receiver and either Text or Image is required"
        )
      );
    }

    // 🖼️ Handle multiple images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `uploads/${file.filename}`);
    }

    const message = await Message.create({
      sender,
      receiver: receiverId,
      text,
      image: images,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, message, "Message sent successfully"));
  } catch (error) {
    console.log("❌ Send Message Error:", error.message);
    console.log("🛠️ Full Error:", error);
    return next(new ApiError(500, "Failed to send message"));
  }
};

const editMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id; // authenticated user
    const { text } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return next(new ApiError(404, "Message not found"));
    }

    // ❌ Not the sender
    if (message.sender.toString() !== userId.toString()) {
      return next(new ApiError(403, "Unauthorized to edit this message"));
    }

    message.text = text || message.text;
    await message.save();

    return res
      .status(200)
      .json(new ApiResponse(200, message, "Message updated successfully"));
  } catch (error) {
    console.log("❌ Edit Message Error:", error);
    return next(new ApiError(500, "Failed to update message"));
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return next(new ApiError(404, "Message not found"));
    }

    // 🛑 Only sender can delete
    if (message.sender.toString() !== userId.toString()) {
      return next(
        new ApiError(403, "You are not allowed to delete this message")
      );
    }

    await message.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message deleted successfully"));
  } catch (error) {
    console.log("❌ Delete Message Error:", error.message);
    return next(new ApiError(500, "Failed to delete message"));
  }
};

// 2️⃣ Get All Messages Between 2 Users
const getMessages = async (req, res, next) => {
  try {
    const user1 = req.user._id;
    const { user2 } = req.params;

    if (!mongoose.Types.ObjectId.isValid(user2)) {
      return next(new ApiError(400, "Invalid user ID"));
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    }).sort({ createdAt: 1 });

    return res
      .status(200)
      .json(new ApiResponse(200, messages, "Messages fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Failed to fetch messages"));
  }
};

// 3️⃣ Get All Chat Users (with lastMessage + lastSeen)
const getChatUsers = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender receiver", "fullName email updatedAt"); // lastSeen = updatedAt

    const chatMap = new Map();

    messages.forEach((msg) => {
      const otherUser = msg.sender._id.equals(userId)
        ? msg.receiver
        : msg.sender;
      if (!chatMap.has(otherUser._id.toString())) {
        chatMap.set(otherUser._id.toString(), {
          userId: otherUser._id,
          fullName: otherUser.fullName,
          email: otherUser.email,
          lastMessage: msg.text || "📷 Image",
          lastSeen: otherUser.updatedAt,
          lastTime: msg.createdAt,
        });
      }
    });

    const chatUsers = Array.from(chatMap.values());

    return res
      .status(200)
      .json(new ApiResponse(200, chatUsers, "Chat users fetched successfully"));
  } catch (error) {
    return next(new ApiError(500, "Failed to get chat users"));
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getChatUsers,
  editMessage,
  deleteMessage,
};
