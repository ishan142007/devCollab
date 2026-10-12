import mongoose from "mongoose";
import User from "../model/User.model.js";
import Project from "../model/Project.model.js";
import ContributionEvidence from "../model/ContributionEvidence.model.js";
import DiscoveredRepository from "../model/DiscoveredRepository.model.js";
import {
    GitHubApiError,
    getPublicRepository,
    getRepositoryEvidence,
    normalizeCommitEvidence,
    normalizePullRequestEvidence
} from "../services/github.service.js";
import { syncOwnedPublicRepositories } from "../services/githubDiscovery.service.js";

const sendError = (res, error) => {
    if (error instanceof GitHubApiError) {
        if (error.status === 429 && error.retryAfter) res.set("Retry-After", error.retryAfter);
        const status = [404, 429, 502, 504].includes(error.status) ? error.status : 502;
        return res.status(status).json({ message: error.message });
    }
    if (error.status === 409) return res.status(409).json({ message: error.message });
    if (error.code === 11000) return res.status(409).json({ message: "This repository or project is already linked." });
    console.error("GitHub repository operation failed:", error.message);
    return res.status(500).json({ message: "GitHub repository operation failed." });
};

const repositoryResponse = (repository) => ({
    id: String(repository._id),
    githubRepositoryId: repository.githubRepositoryId,
    ownerLogin: repository.ownerLogin,
    name: repository.name,
    fullName: repository.fullName,
    url: repository.url,
    description: repository.description,
    visibility: repository.visibility,
    defaultBranch: repository.defaultBranch,
    primaryLanguage: repository.primaryLanguage,
    topics: repository.topics,
    archived: repository.archived,
    fork: repository.fork,
    ownership: repository.ownership,
    contributionStatus: repository.contributionStatus,
    contributionTypes: repository.contributionTypes,
    contributionCheckedAt: repository.contributionCheckedAt,
    linkedProject: repository.linkedProject
        ? { id: String(repository.linkedProject._id || repository.linkedProject), title: repository.linkedProject.title || "" }
        : null,
    lastSeenAt: repository.lastSeenAt,
    available: repository.available
});

export const getMyGitHubRepositories = async (req, res) => {
    try {
        if (req.query.filter !== undefined &&
            !["all", "linked", "unlinked", "verified"].includes(req.query.filter)) {
            return res.status(400).json({ message: "filter must be all, linked, unlinked, or verified." });
        }
        if (req.query.q !== undefined && (typeof req.query.q !== "string" || req.query.q.length > 100)) {
            return res.status(400).json({ message: "q must be a search string of at most 100 characters." });
        }
        for (const parameter of ["page", "limit"]) {
            if (req.query[parameter] !== undefined &&
                (typeof req.query[parameter] !== "string" ||
                    !/^[1-9]\d*$/.test(req.query[parameter]) ||
                    !Number.isSafeInteger(Number(req.query[parameter])) ||
                    (parameter === "page" && Number(req.query[parameter]) > 1000000))) {
                return res.status(400).json({ message: `${parameter} must be a positive integer.` });
            }
        }
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
        const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
        const filter = { user: req.user.id, available: true };
        if (query) {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.fullName = { $regex: escaped, $options: "i" };
        }
        if (req.query.filter === "linked") filter.linkedProject = { $exists: true };
        if (req.query.filter === "unlinked") filter.linkedProject = { $exists: false };
        if (req.query.filter === "verified") filter.contributionStatus = "verified";

        const [repositories, total, loadedUser] = await Promise.all([
            DiscoveredRepository.find(filter).populate("linkedProject", "title")
                .sort({ fullName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            DiscoveredRepository.countDocuments(filter),
            User.findById(req.user.id).select("githubRepositorySync githubUsername githubId")
        ]);
        let user = loadedUser;
        const syncStartedAt = user?.githubRepositorySync?.startedAt;
        const staleSyncBefore = new Date(Date.now() - 5 * 60 * 1000);
        if (user?.githubRepositorySync?.status === "in_progress" &&
            (!syncStartedAt || syncStartedAt < staleSyncBefore)) {
            user = await User.findOneAndUpdate({
                _id: req.user.id,
                "githubRepositorySync.status": "in_progress",
                ...(syncStartedAt ? { "githubRepositorySync.startedAt": syncStartedAt } : {})
            }, {
                $set: {
                    "githubRepositorySync.status": "failed",
                    "githubRepositorySync.completedAt": new Date(),
                    "githubRepositorySync.message": "The previous refresh did not finish. Try refreshing again."
                }
            }, { returnDocument: "after" }).select("githubRepositorySync githubUsername githubId") || user;
        }
        return res.status(200).json({
            data: repositories.map(repositoryResponse),
            pagination: { page, limit, total, hasMore: page * limit < total },
            sync: user?.githubRepositorySync || { status: "never", message: "" },
            githubConnected: Boolean(user?.githubId),
            githubUsername: user?.githubUsername || ""
        });
    } catch (error) {
        console.error("Could not list discovered GitHub repositories:", error.message);
        return res.status(500).json({ message: "Could not load discovered GitHub repositories." });
    }
};

export const refreshMyGitHubRepositories = async (req, res) => {
    try {
        const data = await syncOwnedPublicRepositories(req.user.id);
        return res.status(200).json({ message: "Public repository discovery completed.", data });
    } catch (error) {
        return sendError(res, error);
    }
};

export const linkDiscoveredRepository = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.repositoryId)) {
            return res.status(400).json({ message: "repositoryId must be a valid repository ID." });
        }
        const repository = await DiscoveredRepository.findOne({
            _id: req.params.repositoryId,
            user: req.user.id,
            available: true
        });
        if (!repository) return res.status(404).json({ message: "Discovered repository not found." });

        const { projectId } = req.body || {};
        if (!req.body || Object.keys(req.body).some((key) => key !== "projectId")) {
            return res.status(400).json({ message: "Only projectId may be supplied." });
        }
        if (projectId !== null && (typeof projectId !== "string" || !mongoose.Types.ObjectId.isValid(projectId))) {
            return res.status(400).json({ message: "projectId must be a valid project ID or null to unlink." });
        }

        if (projectId === null) {
            const project = repository.linkedProject
                ? await Project.findOne({ _id: repository.linkedProject, owner: req.user.id })
                : null;
            if (project?.githubRepository?.id === repository.githubRepositoryId) {
                project.githubRepository = undefined;
                project.githubSync = undefined;
                await project.save();
            }
            repository.linkedProject = undefined;
            await repository.save();
            return res.status(200).json({ message: "Repository unlinked.", data: { repository: repositoryResponse(repository) } });
        }

        const project = await Project.findOne({ _id: projectId, owner: req.user.id });
        if (!project) return res.status(404).json({ message: "Project not found." });
        if (repository.linkedProject && String(repository.linkedProject) !== String(project._id)) {
            return res.status(409).json({ message: "This repository is already linked to another project." });
        }
        if (project.githubRepository?.id && project.githubRepository.id !== repository.githubRepositoryId) {
            return res.status(409).json({ message: "Unlink the project's current repository before linking another." });
        }

        const user = await User.findById(req.user.id).select("githubId");
        if (!user?.githubId || user.githubId !== repository.githubOwnerId) {
            return res.status(403).json({ message: "This repository is not owned by your connected GitHub account." });
        }

        project.githubRepository = {
            id: repository.githubRepositoryId,
            ownerId: repository.githubOwnerId,
            ownerLogin: repository.ownerLogin,
            name: repository.name,
            fullName: repository.fullName,
            url: repository.url,
            defaultBranch: repository.defaultBranch,
            private: false
        };
        project.githubSync = undefined;
        await project.save();
        repository.linkedProject = project._id;
        await repository.save();
        return res.status(200).json({
            message: "Discovered repository linked to project.",
            data: { repository: repositoryResponse(repository) }
        });
    } catch (error) {
        console.error("Could not link discovered GitHub repository:", error.message);
        return res.status(500).json({ message: "Could not link discovered GitHub repository." });
    }
};

const getSettledRecords = (result, normalize) => result.status === "fulfilled"
    ? result.value.items.map(normalize).filter(Boolean)
    : [];

export const verifyDiscoveredRepositoryContributions = async (req, res) => {
    let repository;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.repositoryId)) {
            return res.status(400).json({ message: "repositoryId must be a valid repository ID." });
        }
        const [user, discovered] = await Promise.all([
            User.findById(req.user.id).select("githubId"),
            DiscoveredRepository.findOne({ _id: req.params.repositoryId, user: req.user.id, available: true })
        ]);
        repository = discovered;
        if (!repository) return res.status(404).json({ message: "Discovered repository not found." });
        if (!user?.githubId || user.githubId !== repository.githubOwnerId) {
            return res.status(403).json({ message: "This repository is not owned by your connected GitHub account." });
        }

        const current = await getPublicRepository({ owner: repository.ownerLogin, repository: repository.name });
        if (current.private || String(current.id) !== repository.githubRepositoryId ||
            String(current.owner?.id) !== user.githubId) {
            return res.status(403).json({ message: "This repository is no longer a supported public repository owned by your connected account." });
        }
        const result = await getRepositoryEvidence({ owner: repository.ownerLogin, repository: repository.name });
        const failures = ["commits", "pullRequests"].filter((type) => result[type].status === "rejected");
        if (failures.length === 2) {
            const error = result.commits.reason;
            throw error;
        }

        const records = [
            ...getSettledRecords(result.commits, normalizeCommitEvidence),
            ...getSettledRecords(result.pullRequests, normalizePullRequestEvidence)
        ].filter((item) => item.githubUserId === user.githubId);
        const project = repository.linkedProject
            ? await Project.findOne({ _id: repository.linkedProject, owner: req.user.id }).select("_id")
            : null;
        if (records.length) {
            await ContributionEvidence.init();
            await ContributionEvidence.bulkWrite(records.map(({ githubUserId, ...record }) => ({
                updateOne: {
                    filter: {
                        user: req.user.id,
                        repositoryId: repository.githubRepositoryId,
                        type: record.type,
                        externalId: record.externalId
                    },
                    update: {
                        $set: {
                            ...record,
                            user: req.user.id,
                            repositoryId: repository.githubRepositoryId,
                            source: "github",
                            attributionGithubId: githubUserId,
                            ...(project ? { project: project._id } : {})
                        },
                        ...(project ? {} : { $unset: { project: "" } })
                    },
                    upsert: true
                }
            })), { ordered: false });
        }

        repository.contributionStatus = records.length ? "verified" : failures.length ? "failed" : "no_match";
        repository.contributionTypes = [...new Set(records.map((record) => record.type))];
        repository.contributionCheckedAt = new Date();
        await repository.save();
        return res.status(200).json({
            message: records.length
                ? "GitHub activity was verified by matching the connected account's stable GitHub ID."
                : failures.length
                    ? "GitHub could not complete all contribution checks. Retry before drawing a conclusion."
                    : "No matching commits or pull requests were found in the available recent results.",
            data: {
                status: failures.length ? "partial" : repository.contributionStatus,
                matchedRecords: records.length,
                contributionTypes: repository.contributionTypes,
                failedTypes: failures,
                truncated: {
                    commits: result.commits.status === "fulfilled" && result.commits.value.truncated,
                    pullRequests: result.pullRequests.status === "fulfilled" && result.pullRequests.value.truncated
                }
            }
        });
    } catch (error) {
        if (repository) {
            repository.contributionStatus = "failed";
            repository.contributionCheckedAt = new Date();
            await repository.save().catch((saveError) => {
                console.error("Could not record GitHub contribution verification failure:", saveError.message);
            });
        }
        return sendError(res, error);
    }
};
