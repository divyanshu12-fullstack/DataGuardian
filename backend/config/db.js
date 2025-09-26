import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Set mongoose options
    mongoose.set("strictQuery", false);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);

    // Log more detailed error for debugging
    if (error.name === "MongooseServerSelectionError") {
      console.error(
        "This is likely a network connectivity issue. Please check:"
      );
      console.error("1. Your internet connection");
      console.error("2. MongoDB Atlas cluster is running");
      console.error("3. IP address is whitelisted in MongoDB Atlas");
      console.error("4. Username/password are correct");
    }

    // Don't exit immediately in development
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.error(
        "Continuing without database connection in development mode..."
      );
    }
  }
};

const connectWithRetry = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    if (retries > 0) {
      console.log(`Retrying database connection... (${retries} attempts left)`);
      setTimeout(() => connectWithRetry(retries - 1), 5000);
    }
  }
};

export default connectDB;
