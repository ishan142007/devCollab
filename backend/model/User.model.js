import mongoose from "mongoose";
const UserSchema=new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    avatar:String,
    githubId: { type: String, unique: true, sparse: true },

})
const User=mongoose.model("User",UserSchema)
export default User;