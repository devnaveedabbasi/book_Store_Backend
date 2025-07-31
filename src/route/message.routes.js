// message.routes.js
const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getChatUsers,
  editMessage,
  deleteMessage,
} = require("../controllers/message.controller.js");
const { auth } = require("../middlewares/auth.middleware.js");
const upload = require("../middlewares/upload.middleware.js");

// router.post("/send-message", (req, res) => {
//   res.json({ message: "Check API ✅ Without Auth" });
// });

router.post("/send-message", auth, upload.array("image"), sendMessage);

router.get("/chat-users", auth, getChatUsers);

router.get("/get-messages/:user2", auth, getMessages);
router.patch("/edit-message/:messageId", auth, editMessage);
router.delete("/delete-message/:messageId", auth, deleteMessage);

module.exports = router;
