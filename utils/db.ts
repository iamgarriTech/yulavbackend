import mongoose from "mongoose";

require("dotenv").config();
const dbUrl: string = process.env.DB_URL || "";

const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl);
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error(err.message);
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;