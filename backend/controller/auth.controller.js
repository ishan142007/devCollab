import User from "../model/User.model.js"; 
import bcrypt from "bcrypt";
import jwt  from "jsonwebtoken";
const signup=async(req,res)=>{
    try {
       
        const {name ,email,password,avatar}=req.body;
        if(!name||!email||!password){
            return res.status(400).json({message:"enter valid details"});
        }
        const validEmail=await User.findOne({email});
        if(validEmail)return res.status(400).json({message:"email already present "});
        const hashedPassword= await bcrypt.hash(password,10);
        
        const user=await User.create({
            name,
            email,
            password:hashedPassword,
            avatar
        });
        const token=jwt.sign({
            id:user._id,
            email:user.email
        },
        process.env.jwtSecretKey,{
            expiresIn:process.env.jwt_expire_in
        }
        );
         res.cookie("token",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            secure:false
        })
        return res.status(201).json({message:"new user created",success:true})
    } catch (error) {
        res.status(500).json({message:error.message});
    }
}

 const login=async(req,res)=>{
    try {
        const {email,password}=req.body;
            if(!password||!email) return res.status(400).json({message:"credentails not found "});
        const user=await User.findOne({email});
        if(!user)return res.status(404).json({message:"user not found "});
        const ismatch=await bcrypt.compare(password,user.password);
        if(!ismatch)return res.status(400).json({message:"password is incorrect "});
        const token=jwt.sign(
            {
            id:user._id,
            email:user.email
            },
        process.env.jwtSecretKey,
        {
            expiresIn:process.env.jwt_expire_in
        }
        )
        res.cookie("token",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            secure:false
        })
        return res.status(200).json({message:"logged in successfully"});
    } catch (error) {
        return res.status(500).json({message:error.message})
    }
        
        
 }
 const me =async(req,res)=>{
    try {
        if(!req.user)return res.status(400).json({message:"request cant be completed"});
        const user=req.user.id;
        
        const checkUser =await User.findById(user).select("name email avatar");
        // console.log("debug")
        if(!checkUser)return res.status(404).json({message:"user not found"});
        return res.status(200).json({data:checkUser});
    } catch (error) {
        return res.status(500).json({message:"internal server error",error:error.message})
    }
 }

const updateMe = async (req, res) => {
    try {
        const { name, email, avatar } = req.body ?? {};
        const update = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ message: "name is required" });
            }
            update.name = name.trim();
        }
        if (email !== undefined) {
            if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                return res.status(400).json({ message: "enter a valid email address" });
            }
            update.email = email.trim().toLowerCase();
        }
        if (avatar !== undefined) {
            if (typeof avatar !== "string") {
                return res.status(400).json({ message: "avatar must be a URL" });
            }
            update.avatar = avatar.trim();
        }
        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "please send valid profile changes" });
        }

        if (update.email) {
            const existingUser = await User.findOne({ email: update.email, _id: { $ne: req.user.id } });
            if (existingUser) {
                return res.status(409).json({ message: "email is already in use" });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(req.user.id, update, {
            returnDocument: "after",
            runValidators: true
        }).select("name email avatar");
        if (!updatedUser) {
            return res.status(404).json({ message: "user not found" });
        }

        return res.status(200).json({ message: "profile updated", data: updatedUser });
    } catch (error) {
        return res.status(500).json({ message: "could not update profile", error: error.message });
    }
};

export {signup,login,me,updateMe};