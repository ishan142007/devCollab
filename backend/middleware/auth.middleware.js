import jwt from "jsonwebtoken";
const verifyToken=async(req,res,next)=>{
    try {
        const authcookie=req.cookies.token;
        // console.log("debug")
        if(!authcookie)return res.status(401).json({message:"no token found"});
        // const token=authHeader.split(" ")[1];

        const decoded=jwt.verify(authcookie,process.env.jwtSecretKey);
        req.user=decoded;
        next();
    } catch (error) {
        return res.status(500).json({message:"invalid token",error:error.message});
    }
}
export default verifyToken;