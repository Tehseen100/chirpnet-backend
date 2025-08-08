import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import chirpRoutes from "./routes/chirp.routes.js";
import userRoutes from "./routes/user.routes.js";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB Atlas
connectDB();

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/chirps", chirpRoutes);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
