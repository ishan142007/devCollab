import User from "../model/User.model.js";
import { isGitHubProfileUrl } from "../utils/profile.js";

export class GitHubAccountLinkError extends Error {
    constructor(message) {
        super(message);
        this.name = "GitHubAccountLinkError";
        this.status = 409;
    }
}

export const linkGitHubIdentity = async ({ userId, githubProfile, UserModel = User }) => {
    const githubId = githubProfile?.id ? String(githubProfile.id) : "";
    const githubUsername = githubProfile?.login;
    if (!githubId || typeof githubUsername !== "string" || !githubUsername.trim()) {
        throw new Error("GitHub returned an incomplete account identity.");
    }

    const [targetUser, identityOwner] = await Promise.all([
        UserModel.findById(userId),
        UserModel.findOne({ githubId })
    ]);
    if (!targetUser) {
        throw new Error("The DevCollab account for this GitHub connection no longer exists.");
    }
    if (targetUser.githubId && targetUser.githubId !== githubId) {
        throw new GitHubAccountLinkError("A different GitHub account is already connected. Contact support before changing it.");
    }
    if (identityOwner && String(identityOwner._id) !== String(targetUser._id)) {
        throw new GitHubAccountLinkError("This GitHub account is already connected to another DevCollab account.");
    }

    const update = {
        githubId,
        githubUsername: githubUsername.trim()
    };
    if (isGitHubProfileUrl(githubProfile.html_url)) {
        update.githubProfileUrl = githubProfile.html_url;
    }
    try {
        const linkedUser = await UserModel.findOneAndUpdate(
            {
                _id: targetUser._id,
                $or: [
                    { githubId: { $exists: false } },
                    { githubId: null },
                    { githubId }
                ]
            },
            { $set: update },
            { returnDocument: "after", runValidators: true }
        );
        if (!linkedUser) {
            throw new GitHubAccountLinkError("A different GitHub account is already connected.");
        }
        return linkedUser;
    } catch (error) {
        if (error instanceof GitHubAccountLinkError) throw error;
        if (error.code === 11000) {
            throw new GitHubAccountLinkError("This GitHub account is already connected to another DevCollab account.");
        }
        throw error;
    }
};
