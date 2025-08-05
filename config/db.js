import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env configuration
dotenv.config();

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\nMongoDB connected: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log(`\nMongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
