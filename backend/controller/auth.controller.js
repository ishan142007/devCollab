import User from "../model/User.model.js"; 
import bcrypt from "bcrypt";
import jwt  from "jsonwebtoken";
import { randomBytes, timingSafeEqual } from "node:crypto";

const githubStateCookie = "github_oauth_state";
const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax"
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const redirectToLoginWithOAuthError = (res) => {
    return res.redirect(`${getFrontendUrl()}/login?oauth_error=github`);
};

const startGithubOAuth = (req, res) => {
    const { GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL } = process.env;
    if (!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL) {
        return res.status(503).json({ message: "GitHub OAuth is not configured on the server." });
    }

    const state = randomBytes(32).toString("hex");
    res.cookie(githubStateCookie, state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
        path: "/api/auth/github"
    });

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_CALLBACK_URL,
        scope: "read:user user:email",
        state,
        allow_signup: "true"
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

const completeGithubOAuth = async (req, res) => {
    const { code, state, error } = req.query;
    const savedState = req.cookies[githubStateCookie];
    res.clearCookie(githubStateCookie, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/api/auth/github"
    });

    if (error || typeof code !== "string" || typeof state !== "string" ||
        typeof savedState !== "string") {
        return redirectToLoginWithOAuthError(res);
    }

    const receivedState = Buffer.from(state);
    const expectedState = Buffer.from(savedState);
    if (receivedState.length !== expectedState.length ||
        !timingSafeEqual(receivedState, expectedState)) {
        return redirectToLoginWithOAuthError(res);
    }

    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, jwtSecretKey, jwt_expire_in } = process.env;
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL || !jwtSecretKey) {
        console.error("GitHub OAuth callback cannot complete because server configuration is missing.");
        return redirectToLoginWithOAuthError(res);
    }

    try {
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: GITHUB_CALLBACK_URL
            })
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            throw new Error("GitHub did not return an access token.");
        }

        const githubHeaders = {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${tokenData.access_token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "devCollab"
        };
        const [profileResponse, emailsResponse] = await Promise.all([
            fetch("https://api.github.com/user", { headers: githubHeaders }),
            fetch("https://api.github.com/user/emails", { headers: githubHeaders })
        ]);

        if (!profileResponse.ok || !emailsResponse.ok) {
            throw new Error("GitHub could not provide the account profile.");
        }

        const profile = await profileResponse.json();
        const emails = await emailsResponse.json();
        if (!profile.id || !profile.login || !Array.isArray(emails)) {
            throw new Error("GitHub returned an invalid account profile.");
        }

        const githubId = String(profile.id);
        const verifiedEmail = emails.find((entry) => entry.primary && entry.verified)?.email
            || emails.find((entry) => entry.verified)?.email;
        let user = await User.findOne({ githubId });

        if (!user && verifiedEmail) {
            user = await User.findOne({ email: verifiedEmail.toLowerCase() });
            if (user?.githubId && user.githubId !== githubId) {
                return redirectToLoginWithOAuthError(res);
            }
        }

        if (!user) {
            user = await User.create({
                name: profile.name?.trim() || profile.login,
                email: verifiedEmail?.toLowerCase(),
                avatar: profile.avatar_url,
                githubId
            });
        } else if (!user.githubId) {
            user.githubId = githubId;
            if (profile.avatar_url) user.avatar = profile.avatar_url;
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            jwtSecretKey,
            { expiresIn: jwt_expire_in || "7d" }
        );
        res.cookie("token", token, authCookieOptions);
        return res.redirect(getFrontendUrl());
    } catch (oauthError) {
        console.error("GitHub OAuth sign-in failed:", oauthError.message);
        return redirectToLoginWithOAuthError(res);
    }
};

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
         res.cookie("token",token,authCookieOptions)
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
        res.cookie("token",token,authCookieOptions)
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

export {signup,login,me,updateMe,startGithubOAuth,completeGithubOAuth};