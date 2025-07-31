const express = require("express");
const { auth, isAdmin } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const router = express.Router();

router.post("/admin/add", auth, isAdmin, upload.single("icon"), addCategory);
router.get("/all", getAllCategories);
router.get("/:id", getCategoryById);
router.put("/:id", auth, isAdmin, upload.single("icon"), updateCategory);
router.delete("/:id", auth, isAdmin, deleteCategory);

module.exports = router;
