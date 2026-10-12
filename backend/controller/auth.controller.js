import User from "../model/User.model.js"; 
import bcrypt from "bcrypt";
import jwt  from "jsonwebtoken";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { ensureUsername, getSafeUserProfile, isGitHubProfileUrl, isHttpsUrl, normalizeTechnologyTags } from "../utils/profile.js";
import { syncOwnedPublicRepositories } from "../services/githubDiscovery.service.js";
import { linkGitHubIdentity } from "../services/githubAccountLink.service.js";

const githubStateCookie = "github_oauth_state";
const githubLinkIntentCookie = "github_oauth_link_intent";
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

const redirectToProfileWithOAuthError = (res, reason = "github_link") => {
    return res.redirect(`${getFrontendUrl()}/profile?oauth_error=${reason}`);
};

const startGithubOAuth = (req, res) => {
    const { GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL } = process.env;
    if (!GITHUB_CLIENT_ID || !GITHUB_CALLBACK_URL) {
        return res.status(503).json({ message: "GitHub OAuth is not configured on the server." });
    }

    const state = randomBytes(32).toString("hex");
    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
        path: "/api/auth/github"
    };
    res.cookie(githubStateCookie, state, cookieOptions);
    if (req.user?.id) {
        if (!process.env.jwtSecretKey) {
            return res.status(503).json({ message: "GitHub account linking is not configured on the server." });
        }
        const linkIntent = jwt.sign(
            { purpose: "github_account_link", userId: String(req.user.id), state },
            process.env.jwtSecretKey,
            { expiresIn: "10m", audience: "github-oauth-link" }
        );
        res.cookie(githubLinkIntentCookie, linkIntent, cookieOptions);
    } else {
        res.clearCookie(githubLinkIntentCookie, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/api/auth/github"
        });
    }

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_CALLBACK_URL,
        scope: "read:user user:email",
        state,
        allow_signup: "true"
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

const logout = (_req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/"
    });
    return res.status(200).json({ message: "Logged out successfully." });
};

const completeGithubOAuth = async (req, res) => {
    const { code, state, error } = req.query;
    const savedState = req.cookies?.[githubStateCookie];
    const savedLinkIntent = req.cookies?.[githubLinkIntentCookie];
    const oauthErrorRedirect = () => savedLinkIntent
        ? redirectToProfileWithOAuthError(res)
        : redirectToLoginWithOAuthError(res);
    res.clearCookie(githubStateCookie, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/api/auth/github"
    });
    res.clearCookie(githubLinkIntentCookie, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/api/auth/github"
    });

    if (error || typeof code !== "string" || typeof state !== "string" ||
        typeof savedState !== "string") {
        return oauthErrorRedirect();
    }

    const receivedState = Buffer.from(state);
    const expectedState = Buffer.from(savedState);
    if (receivedState.length !== expectedState.length ||
        !timingSafeEqual(receivedState, expectedState)) {
        return oauthErrorRedirect();
    }

    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, jwtSecretKey, jwt_expire_in } = process.env;
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL || !jwtSecretKey) {
        console.error("GitHub OAuth callback cannot complete because server configuration is missing.");
        return oauthErrorRedirect();
    }

    let linkUserId;
    if (savedLinkIntent) {
        try {
            const intent = jwt.verify(savedLinkIntent, jwtSecretKey, { audience: "github-oauth-link" });
            const session = req.cookies?.token
                ? jwt.verify(req.cookies.token, jwtSecretKey)
                : null;
            if (intent.purpose !== "github_account_link" || intent.state !== state ||
                !session?.id || String(session.id) !== String(intent.userId)) {
                return redirectToProfileWithOAuthError(res, "github_link_session");
            }
            linkUserId = String(intent.userId);
        } catch {
            return redirectToProfileWithOAuthError(res, "github_link_session");
        }
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
        const profileResponse = await fetch("https://api.github.com/user", { headers: githubHeaders });
        if (!profileResponse.ok) {
            throw new Error("GitHub could not provide the account profile.");
        }

        const profile = await profileResponse.json();
        if (!profile.id || !profile.login || !isGitHubProfileUrl(profile.html_url)) {
            throw new Error("GitHub returned an invalid account profile.");
        }

        if (linkUserId) {
            const user = await linkGitHubIdentity({ userId: linkUserId, githubProfile: profile });
            void syncOwnedPublicRepositories(user._id).catch((discoveryError) => {
                console.error("GitHub repository discovery after account linking failed:", discoveryError.message);
            });
            return res.redirect(`${getFrontendUrl()}/profile?github_connected=1`);
        }

        const emailsResponse = await fetch("https://api.github.com/user/emails", { headers: githubHeaders });
        if (!emailsResponse.ok) {
            throw new Error("GitHub could not provide the account profile.");
        }
        const emails = await emailsResponse.json();
        if (!Array.isArray(emails)) {
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
                githubId,
                githubUsername: profile.login,
                githubProfileUrl: profile.html_url
            });
        } else {
            const wasConnected = Boolean(user.githubId);
            if (!wasConnected) user.githubId = githubId;
            user.githubUsername = profile.login;
            user.githubProfileUrl = profile.html_url;
            if (!wasConnected && profile.avatar_url) user.avatar = profile.avatar_url;
            await user.save();
        }
        await ensureUsername(user);

        const token = jwt.sign(
            { id: user._id, email: user.email },
            jwtSecretKey,
            { expiresIn: jwt_expire_in || "7d" }
        );
        res.cookie("token", token, authCookieOptions);
        void syncOwnedPublicRepositories(user._id).catch((discoveryError) => {
            console.error("Initial public GitHub repository discovery failed:", discoveryError.message);
        });
        return res.redirect(getFrontendUrl());
    } catch (oauthError) {
        if (linkUserId) {
            if (oauthError.status === 409) {
                return redirectToProfileWithOAuthError(res, "github_link_conflict");
            }
            console.error("GitHub account linking failed:", oauthError.message);
            return redirectToProfileWithOAuthError(res);
        }
        console.error("GitHub OAuth sign-in failed:", oauthError.message);
        return redirectToLoginWithOAuthError(res);
    }
};

const signup=async(req,res)=>{
    try {
       
        const {name ,email,password,avatar}=req.body ?? {};
        if(typeof name !== "string" || !name.trim() || name.trim().length > 80 ||
            typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== "string" || !password ||
            (avatar !== undefined && (typeof avatar !== "string" ||
                avatar.trim().length > 2048 ||
                (avatar.trim() && !isHttpsUrl(avatar.trim()))))){
            return res.status(400).json({message:"enter valid details"});
        }
        const normalizedEmail = email.trim().toLowerCase();
        const validEmail=await User.findOne({email: normalizedEmail});
        if(validEmail)return res.status(400).json({message:"email already present "});
        const hashedPassword= await bcrypt.hash(password,10);
        
        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            password:hashedPassword,
            avatar: avatar?.trim() || ""
        });
        await ensureUsername(user);
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
        const user=await User.findOne({email: email.trim().toLowerCase()}).select("+password");
        if(!user)return res.status(404).json({message:"user not found "});
        if(!user.password)return res.status(400).json({message:"this account does not have a password login"});
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
        
        const checkUser = await User.findById(user).select(
            "name username email avatar bio profileVisibility technologies githubId githubUsername githubProfileUrl"
        );
        if(!checkUser)return res.status(404).json({message:"user not found"});
        await ensureUsername(checkUser);
        return res.status(200).json({data:getSafeUserProfile(checkUser)});
    } catch (error) {
        return res.status(500).json({message:"internal server error",error:error.message})
    }
 }

const updateMe = async (req, res) => {
    try {
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({ message: "profile changes must be an object" });
        }
        const allowedFields = new Set(["name", "email", "avatar", "bio", "profileVisibility", "technologies"]);
        const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
        if (unknownFields.length) {
            return res.status(400).json({ message: "one or more profile fields cannot be changed" });
        }
        const { name, email, avatar, bio, profileVisibility, technologies } = body;
        const update = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
                return res.status(400).json({ message: "name must contain 1 to 80 characters" });
            }
            update.name = name.trim();
        }
        if (email !== undefined) {
            if (typeof email !== "string" || email.trim().length > 254 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                return res.status(400).json({ message: "enter a valid email address" });
            }
            update.email = email.trim().toLowerCase();
        }
        if (avatar !== undefined) {
            if (typeof avatar !== "string" || avatar.trim().length > 2048 ||
                (avatar.trim() && !isHttpsUrl(avatar.trim()))) {
                return res.status(400).json({ message: "avatar must be a URL" });
            }
            update.avatar = avatar.trim();
        }
        if (bio !== undefined) {
            if (typeof bio !== "string" || bio.trim().length > 280) {
                return res.status(400).json({ message: "bio must be at most 280 characters" });
            }
            update.bio = bio.trim();
        }
        if (profileVisibility !== undefined) {
            if (!["public", "private"].includes(profileVisibility)) {
                return res.status(400).json({ message: "profile visibility must be public or private" });
            }
            update.profileVisibility = profileVisibility;
        }
        if (technologies !== undefined) {
            const normalizedTags = normalizeTechnologyTags(technologies);
            if (!normalizedTags) {
                return res.status(400).json({ message: "technologies must be a list of up to 20 tags, each 1 to 40 characters" });
            }
            update.technologies = normalizedTags;
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
        }).select("name username email avatar bio profileVisibility technologies githubId githubUsername githubProfileUrl");
        if (!updatedUser) {
            return res.status(404).json({ message: "user not found" });
        }

        await ensureUsername(updatedUser);
        return res.status(200).json({ message: "profile updated", data: getSafeUserProfile(updatedUser) });
    } catch (error) {
        console.error("Could not update profile:", error.message);
        return res.status(500).json({ message: "could not update profile" });
    }
};

export {signup,login,logout,me,updateMe,startGithubOAuth,completeGithubOAuth};