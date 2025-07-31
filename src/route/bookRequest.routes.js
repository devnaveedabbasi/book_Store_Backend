const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth.middleware.js");
const {
  createBookRequest,
  updateBookRequestStatus,
  getUserBookRequests,
  checkBookRequest,
  cancelBookRequest,
  searchBooksRequests,
  getPaginatedRequests,
  getSentRequests,
} = require("../controllers/bookRequest.controller.js");

router.post("/add", auth, createBookRequest);
router.get("/check/:bookId", auth, checkBookRequest);
router.get("/get", auth, getUserBookRequests);
router.get("/search", auth, searchBooksRequests);
router.get("/paginated", auth, getPaginatedRequests);
router.get("/get-send-requests", auth, getSentRequests);

router.post("/status/:id", auth, updateBookRequestStatus);
router.post("/cancel/:bookId", auth, cancelBookRequest);
module.exports = router;
