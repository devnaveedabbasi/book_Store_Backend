const { BookRequest } = require("../models/bookRequest.models.js");
const { Book } = require("../models/book.model.js");
const { ApiError } = require("../utils/apiError.js");
const { ApiResponse } = require("../utils/apiResponse.js");
const createBookRequest = async (req, res) => {
  try {
    const { bookId } = req.body;
    const requesterId = req.user._id;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json(new ApiError(404, "Book not found"));
    }

    if (book.uploader.toString() === requesterId.toString()) {
      return res
        .status(400)
        .json(new ApiError(400, "You cannot request your own book."));
    }

    const existing = await BookRequest.findOne({
      book: bookId,
      requester: requesterId,
    });

    if (existing) {
      return res
        .status(409)
        .json(new ApiError(409, "You already requested this book."));
    }

    const bookRequest = await BookRequest.create({
      book: bookId,
      requester: requesterId,
      owner: book.uploader, // ✅ Fix applied here
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, { request: bookRequest }, "Book request sent")
      );
  } catch (error) {
    console.error("Book Request Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong while sending request", error)
      );
  }
};

const updateBookRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Invalid status value. Only 'approved' or 'rejected' allowed"
          )
        );
    }

    const request = await BookRequest.findById(id);
    if (!request) {
      return res.status(404).json(new ApiError(404, "Book request not found"));
    }

    // Only allow update if status is pending
    if (request.status !== "pending") {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Cannot update request. Current status is '${request.status}'`
          )
        );
    }

    request.status = status;
    await request.save();

    return res
      .status(200)
      .json(
        new ApiResponse(200, request, `Book request ${status} successfully`)
      );
  } catch (error) {
    console.error("Update Status Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Failed to update book request status",
          error?.message
        )
      );
  }
};

const getUserBookRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await BookRequest.find({
      $or: [{ requester: userId }, { owner: userId }],
    })
      .populate("book", "title")
      .populate("requester", "_id fullName")
      .populate("owner", "_id fullName")
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, requests));
  } catch (error) {
    console.error("Get Book Requests Error:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch book requests", error));
  }
};

const searchBooksRequests = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res
        .status(400)
        .json(new ApiError(400, "Search query is required"));
    }

    const regex = new RegExp(query, "i");

    const matchedBooks = await Book.find({
      $or: [{ title: regex }, { slug: regex }],
    }).select("_id");

    const bookIds = matchedBooks.map((book) => book._id);

    // 📦 BookRequests jisme book match ho
    const requests = await BookRequest.find({
      book: { $in: bookIds },
    })
      .populate("book", "title slug")
      .populate("requester", "fullName email")
      .populate("owner", "fullName email")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, requests, "Search results fetched"));
  } catch (error) {
    console.error("Search BookRequests Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Failed to search book requests", error?.message)
      );
  }
};
const getPaginatedRequests = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      BookRequest.find({ owner: req.user._id }) // ✅ Only requests for YOUR books
        .populate({
          path: "book",
          populate: [
            { path: "category", select: "name icon" },
            { path: "author", select: "fullName avatar" },
          ],
        })
        .populate("requester", "fullName email")
        .populate("owner", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      BookRequest.countDocuments({ owner: req.user._id }), // ✅ Match count accordingly
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          requests,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
        "Paginated book requests for your books fetched"
      )
    );
  } catch (error) {
    console.error("Request Pagination Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Failed to fetch paginated book requests",
          error?.message
        )
      );
  }
};
const getSentRequests = async (req, res) => {
  try {
    const requests = await BookRequest.find({ requester: req.user._id }) // ✅ Just requests sent by you
      .populate({
        path: "book",
        populate: [
          { path: "category", select: "name icon" },
          { path: "author", select: "fullName avatar" },
        ],
      })
      .populate("requester", "fullName email")
      .populate("owner", "fullName email")
      .sort({ createdAt: -1 }); // Optional: recent first

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          requests,
        },
        "All requests sent by you fetched successfully"
      )
    );
  } catch (error) {
    console.error("Get Sent Requests Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(500, "Failed to fetch sent book requests", error?.message)
      );
  }
};

const checkBookRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;

    const existingRequest = await BookRequest.findOne({
      requester: userId,
      book: bookId,
    });

    if (existingRequest) {
      return res
        .status(200)
        .json(new ApiResponse(200, { alreadyRequested: true }));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, { alreadyRequested: false }));
  } catch (error) {
    console.error("Check Book Request Error:", error);
    return res.status(500).json(new ApiError(500, "Server error", error));
  }
};

const cancelBookRequest = async (req, res) => {
  try {
    const { bookId } = req.params;
    const requesterId = req.user._id;

    const deleted = await BookRequest.findOneAndDelete({
      book: bookId,
      requester: requesterId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json(new ApiError(404, "No book request found to cancel."));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Book request cancelled successfully."));
  } catch (error) {
    console.error("Cancel Book Request Error:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Something went wrong while cancelling request",
          error
        )
      );
  }
};

module.exports = {
  createBookRequest,
  getUserBookRequests,
  updateBookRequestStatus,
  checkBookRequest,
  cancelBookRequest,
  getPaginatedRequests,
  searchBooksRequests,
  getSentRequests,
};
