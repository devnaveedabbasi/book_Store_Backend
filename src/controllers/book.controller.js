const { ApiError } = require("../utils/apiError.js");
const { ApiResponse } = require("../utils/apiResponse.js");
const { Book } = require("../models/book.model.js");
const mongoose = require("mongoose");
const slugify = require("slugify");

// const { uploadOnCloudinary } = require("../utils/fileUpload.js");

const addBook = async (req, res) => {
  try {
    const {
      title,
      genre,
      condition,
      pages,
      description,
      location,
      productType,
      price,
      categoryId,
    } = req.body;

    const user = req.user;

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (
      !title ||
      !genre ||
      genre.length === 0 ||
      !condition ||
      !location ||
      !productType ||
      !categoryId
    ) {
      throw new ApiError(
        400,
        "Title, genre, condition, location, productType and categoryId are required"
      );
    }

    // ✅ Validate price only if productType is "sale"
    if (productType === "sale" && (!price || isNaN(price))) {
      throw new ApiError(400, "Price is required for sale books");
    }

    const images = req.files?.map((file) => `uploads/${file.filename}`) || [];

    const slug = slugify(title, { lower: true, strict: true });

    const book = await Book.create({
      title,
      slug,
      genre: Array.isArray(genre) ? genre : [genre],
      condition,
      description,
      pages,
      image: images,
      location,
      productType,
      price: productType === "sale" ? price : 0,
      author: user._id,
      category: categoryId,
    });

    res.status(201).json(new ApiResponse(201, book, "Book added successfully"));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const getAllBooksByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized: User not logged in");
    }

    const books = await Book.find({ author: userId })
      .populate("category", "name icon")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, books, "User's books fetched successfully"));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Something went wrong while fetching books",
    });
  }
};

const getBookBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const book = await Book.findOne({ slug })
      .populate("category", "name icon")
      .populate("author", "fullName email");

    if (!book) {
      return res.status(404).json(new ApiError(404, "Book not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, book, "Book fetched successfully"));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const loggedInUserId = req.user._id;

    // 🧠 Copy body data first
    const updatedData = { ...req.body };

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `uploads/${file.filename}`);
      updatedData.image = newImages;
    }

    // ✅ Validate book ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(new ApiError(400, "Invalid book ID"));
    }

    // 🔍 Find the book
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json(new ApiError(404, "Book not found"));
    }

    // 🔒 Only owner can update
    if (book.author.toString() !== loggedInUserId.toString()) {
      return res
        .status(403)
        .json(new ApiError(403, "Access denied: Not your book"));
    }

    // 🔄 Update book
    const updatedBook = await Book.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updatedBook, "Book updated successfully"));
  } catch (error) {
    console.error("Update Book Error:", error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find()
      .populate("author", "fullName email")
      .populate("category", "name icon")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, books, "All books fetched successfully"));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      error.message || "Something went wrong while fetching books";

    return res.status(statusCode).json(new ApiError(statusCode, message));
  }
};

const filterBooks = async (req, res) => {
  try {
    const {
      search = "", // for title search
      category,
      minPrice = 0,
      maxPrice = Number.MAX_SAFE_INTEGER,
      minPages = 0,
      maxPages = Number.MAX_SAFE_INTEGER,
      productType,
      condition,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {
      title: { $regex: search, $options: "i" },
      price: { $gte: Number(minPrice), $lte: Number(maxPrice) },
    };

    if (category) {
      query.category = category;
    }

    if (productType) {
      query.productType = productType;
    }

    if (condition) {
      query.condition = condition;
    }

    // ✅ FIXED: Correct number comparison for pages
    if (minPages || maxPages) {
      query.pages = {
        $gte: Number(minPages),
        $lte: Number(maxPages),
      };
    }

    const books = await Book.find(query)
      .populate("author", "name email")
      .populate("category", "name icon")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Book.countDocuments(query);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { total, books },
          "Filtered books fetched successfully"
        )
      );
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Error fetching filtered books"
        )
      );
  }
};

const getRelatedBooks = async (req, res) => {
  try {
    const { bookId } = req.params;

    const mainBook = await Book.findById(bookId);

    if (!mainBook) {
      return res.status(404).json(new ApiError(404, "Book not found"));
    }

    const relatedBooks = await Book.find({
      _id: { $ne: bookId }, // exclude the main book
      $or: [
        { category: mainBook.category },
        { genre: { $in: mainBook.genre } },
      ],
    })
      .limit(10)
      .populate("author", "fullName email")
      .populate("category", "name icon");

    return res
      .status(200)
      .json(new ApiResponse(200, relatedBooks, "Related books fetched"));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(
        new ApiError(
          error.statusCode || 500,
          error.message || "Something went wrong"
        )
      );
  }
};

module.exports = {
  addBook,
  getAllBooksByUser,
  getBookBySlug,
  updateBook,
  getAllBooks,
  filterBooks,
  getRelatedBooks,
};

// const bookBannerUploadOnCloudninary = await uploadOnCloudinary(
//   req.file.path
// );

// if (!bookBannerUploadOnCloudninary) {
//   throw new ApiError(
//     501,
//     "bookBanner Uploading On Cloudninary uploading error"
//   );
// }
// image: bookBannerUploadOnCloudninary.secure_url,
