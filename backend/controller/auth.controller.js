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
            httpOnly:true
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
        const ismatch=bcrypt.compare(password,user.password);
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
            httpOnly:true
        })
        return res.status(200).json({message:"logged in successfully"});
    } catch (error) {
        return res.status(500).json({message:error.message})
    }
        
        
 }

export {signup,login};