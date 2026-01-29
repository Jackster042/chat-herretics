import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URI!;
        if(!mongoUrl){
            throw new Error("MONGO_URI is not set");
        }
        
        // Debug: Log connection attempt (hide password)
        const debugUrl = mongoUrl.replace(/:([^@]+)@/, ":****@");
        // console.log("Connecting to:", debugUrl);
        
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
        });
        
        console.log("✅ MongoDB connected successfully");
    }catch(error){
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}