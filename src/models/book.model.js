const mongoose = require("mongoose");
const { Schema } = mongoose;

const bookSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    genre: {
      type: [String],
      default: [],
    },
    condition: {
      type: String,
      enum: ["new", "used"],
      required: true,
    },
    productType: {
      type: String,
      enum: ["exchange", "free", "sale"], // correct spelling "exchange"
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    description: String,
    pages: Number,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    image: [{ type: String }],
    location: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", bookSchema);
module.exports = { Book };
