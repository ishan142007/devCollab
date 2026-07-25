import mongoose from "mongoose";
const connectDB=async()=>{
    try {
       await mongoose.connect(process.env.DB+"devCollab");
        console.log("db connected");
    } catch (error) {
        console.log("db is not connected ",error.message);
    }

}

export default connectDB;