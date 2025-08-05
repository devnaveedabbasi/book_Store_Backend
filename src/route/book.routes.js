const express = require("express");
const {
  addBook,
  getAllBooksByUser,
  updateBook,
  filterBooks,
  getAllBooks,
  getRelatedBooks,
  getBookBySlug,
  getAllAuthors,
  getAllUploaders,
} = require("../controllers/book.controller");
const { auth } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

const router = express.Router();

router.post("/add", auth, upload.array("images", 5), addBook);
router.get("/all", getAllBooks);
router.get("/filter", filterBooks);
router.put("/update/:id", auth, upload.array("images", 5), updateBook);
router.get("/my-books", auth, getAllBooksByUser);
router.get("/my/:slug", auth, getBookBySlug);
router.get("/related/:bookId", getRelatedBooks);
router.get("/all-authors", getAllAuthors);
router.get("/all-uploaders", getAllUploaders);

module.exports = router;
