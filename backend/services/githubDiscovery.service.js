import DiscoveredRepository from "../model/DiscoveredRepository.model.js";
import User from "../model/User.model.js";
import { getPublicUserRepositories } from "./github.service.js";

const activeSyncs = new Set();
const SYNC_LOCK_LEASE_MS = 5 * 60 * 1000;

export const normalizeDiscoveredRepository = (repository, githubId, username, lastSeenAt = new Date()) => {
    if (!repository?.id || !repository.owner?.id || !repository.owner?.login ||
        String(repository.owner.id) !== String(githubId) ||
        String(repository.owner.login).toLowerCase() !== String(username).toLowerCase() ||
        repository.private !== false || !repository.name || !repository.full_name ||
        typeof repository.html_url !== "string") {
        return null;
    }

    let url;
    try {
        url = new URL(repository.html_url);
    } catch {
        return null;
    }
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password) return null;

    return {
        githubRepositoryId: String(repository.id),
        githubOwnerId: String(repository.owner.id),
        ownerLogin: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        url: url.toString(),
        description: typeof repository.description === "string" ? repository.description.slice(0, 2000) : "",
        visibility: "public",
        defaultBranch: typeof repository.default_branch === "string" ? repository.default_branch.slice(0, 255) : "",
        primaryLanguage: typeof repository.language === "string" ? repository.language.slice(0, 100) : "",
        topics: Array.isArray(repository.topics)
            ? repository.topics.filter((topic) => typeof topic === "string").slice(0, 20).map((topic) => topic.slice(0, 100))
            : [],
        githubCreatedAt: repository.created_at ? new Date(repository.created_at) : undefined,
        githubUpdatedAt: repository.updated_at ? new Date(repository.updated_at) : undefined,
        archived: Boolean(repository.archived),
        fork: Boolean(repository.fork),
        ownership: "owned",
        lastSeenAt,
        available: true
    };
};

export const syncOwnedPublicRepositories = async (userId, {
    UserModel = User,
    DiscoveredRepositoryModel = DiscoveredRepository,
    listRepositories = getPublicUserRepositories
} = {}) => {
    const key = String(userId);
    if (activeSyncs.has(key)) {
        const error = new Error("A repository refresh is already in progress.");
        error.status = 409;
        throw error;
    }
    activeSyncs.add(key);

    const startedAt = new Date();
    let user;
    try {
        const retryStaleLockBefore = new Date(Date.now() - SYNC_LOCK_LEASE_MS);
        user = await UserModel.findOneAndUpdate({
            _id: userId,
            githubId: { $exists: true, $ne: null },
            githubUsername: { $type: "string", $ne: "" },
            $or: [
                { "githubRepositorySync.status": { $ne: "in_progress" } },
                { "githubRepositorySync.startedAt": { $lt: retryStaleLockBefore } },
                { "githubRepositorySync.startedAt": { $exists: false } }
            ]
        }, {
            $set: {
                githubRepositorySync: {
                    status: "in_progress",
                    startedAt,
                    message: "",
                    truncated: false
                }
            }
        }, { returnDocument: "after" }).select("githubId githubUsername githubRepositorySync");
        if (!user?.githubId || !user.githubUsername) {
            const existingUser = await UserModel.findById(userId).select("githubId githubUsername githubRepositorySync");
            const error = new Error(existingUser?.githubId && existingUser?.githubUsername
                ? "A repository refresh is already in progress."
                : "Connect a GitHub account before discovering repositories.");
            error.status = 409;
            throw error;
        }

        const result = await listRepositories(user.githubUsername);
        const lastSeenAt = new Date();
        const repositories = result.items
            .map((item) => normalizeDiscoveredRepository(item, user.githubId, user.githubUsername, lastSeenAt))
            .filter(Boolean);

        await DiscoveredRepositoryModel.init();
        if (repositories.length) {
            await DiscoveredRepositoryModel.bulkWrite(repositories.map((repository) => ({
                updateOne: {
                    filter: { user: user._id, githubRepositoryId: repository.githubRepositoryId },
                    update: { $set: repository, $setOnInsert: { user: user._id } },
                    upsert: true
                }
            })), { ordered: false });
        }

        if (!result.truncated) {
            await DiscoveredRepositoryModel.updateMany(
                { user: user._id, lastSeenAt: { $lt: lastSeenAt } },
                { $set: { available: false } }
            );
        }

        const status = result.truncated ? "partial" : "success";
        user.githubRepositorySync = {
            status,
            startedAt,
            completedAt: new Date(),
            truncated: result.truncated,
            message: result.truncated
                ? "A bounded refresh limit was reached; some repositories may not be listed."
                : `Public repositories owned by @${user.githubUsername} were refreshed.`
        };
        await user.save();
        return {
            status,
            discovered: repositories.length,
            truncated: result.truncated,
            completedAt: user.githubRepositorySync.completedAt
        };
    } catch (error) {
        if (user) {
            user.githubRepositorySync = {
                status: "failed",
                startedAt,
                completedAt: new Date(),
                truncated: false,
                message: error.message.slice(0, 300)
            };
            await user.save().catch((saveError) => {
                console.error("Could not record GitHub repository refresh failure:", saveError.message);
            });
        }
        throw error;
    } finally {
        activeSyncs.delete(key);
    }
};
