import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import errorHandler from "./middlewares/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import chirpRoutes from "./routes/chirp.routes.js";
import userRoutes from "./routes/user.routes.js";

// Initialize express app
const app = express();

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

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/chirps", chirpRoutes);

// Error Handler
app.use(errorHandler);

export default app;
