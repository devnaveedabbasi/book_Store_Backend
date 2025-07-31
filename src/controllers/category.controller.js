const { Category } = require("../models/category.models.js");
const { ApiError } = require("../utils/apiError.js");
const { ApiResponse } = require("../utils/apiResponse.js");

const addCategory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json(new ApiError(403, "Only admins can create categories"));
    }

    const { name } = req.body;
    const icon = `uploads/${req.file?.filename}`;

    if (!name || !icon) {
      return res.status(400).json(new ApiError(400, "All fields are required"));
    }

    // 🔍 Check if category already exists
    const existingCategory = await Category.findOne({
      name: name.trim().toLowerCase(),
    });
    if (existingCategory) {
      return res
        .status(409)
        .json(new ApiError(409, "Category with this name already exists"));
    }

    const category = await Category.create({
      name: name.trim().toLowerCase(),
      icon,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, category, "Category added successfully"));
  } catch (error) {
    console.error("Add Category Error:", error);

    // 🧠 Optional: Handle MongoDB unique error gracefully
    if (error.code === 11000) {
      return res
        .status(409)
        .json(new ApiError(409, "Duplicate category name not allowed"));
    }

    return res
      .status(500)
      .json(new ApiError(500, "Something went wrong while adding category"));
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    return res
      .status(200)
      .json(new ApiResponse(200, categories, "All categories fetched"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch categories"));
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json(new ApiError(404, "Category not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, category, "Category found"));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Failed to get category"));
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };

    // Check if new file is uploaded
    if (req.file) {
      updatedData.icon = `uploads/${req.file.filename}`;
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedCategory) {
      return res.status(404).json(new ApiError(404, "Category not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedCategory, "Category updated successfully")
      );
  } catch (error) {
    console.error("Update Category Error:", error);
    return res.status(500).json(new ApiError(500, "Failed to update category"));
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json(new ApiError(404, "Category not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, deleted, "Category deleted"));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Failed to delete category"));
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
