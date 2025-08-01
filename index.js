const express = require("express");
const cors = require("cors");
const errorHandler = require("./src/middlewares/errorHanlder.middlewares.js");
const connectDb = require("./src/config/db.config.js");
const path = require("path"); // ✅ IMPORT PATH

const handleSocket = require("./src/utils/hanldeSocket.js");
const { Server } = require("socket.io");
const { createServer } = require("http");
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

handleSocket(io);

connectDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });

// routes
const userRoute = require("./src/route/user.routes.js");
const bookRoute = require("./src/route/book.routes.js");
const categoryRoute = require("./src/route/category.routes.js");
const messageRoute = require("./src/route/message.routes.js");
const bookRequest = require("./src/route/bookRequest.routes.js");
app.use("/api/v1/user", userRoute);
app.use("/api/v1/book", bookRoute);
app.use("/api/v1/category", categoryRoute);
app.use("/api/v1/msg", messageRoute);
app.use("/api/v1/book/req", bookRequest);

app.use("/uploads", express.static(path.join(__dirname, "public/temp")));

app.use(errorHandler);
