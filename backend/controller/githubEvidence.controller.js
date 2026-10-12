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
    normalizePullRequestEvidence,
    parseGitHubRepositoryUrl
} from "../services/github.service.js";

const getOwnedProject = async (projectId, ownerId) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
    return Project.findOne({ _id: projectId, owner: ownerId });
};

const publicRepositoryData = (repository) => ({
    id: String(repository.id),
    ownerId: String(repository.owner.id),
    ownerLogin: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    defaultBranch: repository.default_branch || "",
    private: Boolean(repository.private)
});

const sendGitHubError = (res, error) => {
    if (error.code === 11000) {
        return res.status(409).json({ message: "This repository or project is already linked." });
    }
    if (error instanceof GitHubApiError) {
        if (error.status === 429 && error.retryAfter) res.set("Retry-After", error.retryAfter);
        const status = [404, 429, 502, 504].includes(error.status) ? error.status : 502;
        return res.status(status).json({ message: error.message });
    }
    console.error("GitHub evidence request failed:", error.message);
    return res.status(500).json({ message: "GitHub evidence request failed" });
};

export const linkGitHubRepository = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("githubId");
        if (!user?.githubId) {
            return res.status(409).json({ message: "Connect a GitHub account before linking a repository." });
        }
        const project = await getOwnedProject(req.params.projectId, req.user.id);
        if (!project) return res.status(404).json({ message: "project not found" });

        const parsed = parseGitHubRepositoryUrl(req.body?.url);
        if (!parsed) {
            return res.status(400).json({ message: "Enter a canonical https://github.com/owner/repository URL." });
        }
        const repository = await getPublicRepository(parsed);
        if (repository.private) {
            return res.status(400).json({ message: "Private repositories are not supported by this integration." });
        }
        if (String(repository.owner.id) !== user.githubId) {
            return res.status(403).json({ message: "Only public repositories owned by your connected GitHub account can be linked." });
        }
        if (project.githubRepository?.id && project.githubRepository.id !== String(repository.id)) {
            return res.status(409).json({ message: "Unlink the project's current repository before linking another." });
        }
        const discovered = await DiscoveredRepository.findOne({
            user: req.user.id,
            githubRepositoryId: String(repository.id)
        }).select("linkedProject");
        if (discovered?.linkedProject && String(discovered.linkedProject) !== String(project._id)) {
            return res.status(409).json({ message: "This repository is already linked to another project." });
        }

        project.githubRepository = publicRepositoryData(repository);
        project.githubSync = undefined;
        await project.save();
        const lastSeenAt = new Date();
        await DiscoveredRepository.findOneAndUpdate(
            { user: req.user.id, githubRepositoryId: String(repository.id) },
            {
                $set: {
                    githubOwnerId: String(repository.owner.id),
                    ownerLogin: repository.owner.login,
                    name: repository.name,
                    fullName: repository.full_name,
                    url: repository.html_url,
                    description: typeof repository.description === "string" ? repository.description.slice(0, 2000) : "",
                    visibility: "public",
                    defaultBranch: repository.default_branch || "",
                    primaryLanguage: typeof repository.language === "string" ? repository.language : "",
                    topics: Array.isArray(repository.topics) ? repository.topics : [],
                    githubCreatedAt: repository.created_at,
                    githubUpdatedAt: repository.updated_at,
                    archived: Boolean(repository.archived),
                    fork: Boolean(repository.fork),
                    ownership: "owned",
                    available: true,
                    lastSeenAt,
                    linkedProject: project._id
                },
                $setOnInsert: { user: req.user.id }
            },
            { upsert: true, runValidators: true, returnDocument: "after" }
        );
        return res.status(200).json({
            message: "Public GitHub repository linked",
            data: { githubRepository: project.githubRepository }
        });
    } catch (error) {
        return sendGitHubError(res, error);
    }
};

export const unlinkGitHubRepository = async (req, res) => {
    try {
        const project = await getOwnedProject(req.params.projectId, req.user.id);
        if (!project) return res.status(404).json({ message: "project not found" });
        const repositoryId = project.githubRepository?.id;
        project.githubRepository = undefined;
        project.githubSync = undefined;
        await project.save();
        if (repositoryId) {
            await DiscoveredRepository.updateOne(
                { user: req.user.id, githubRepositoryId: repositoryId },
                { $unset: { linkedProject: "" } }
            );
        }
        return res.status(200).json({ message: "GitHub repository unlinked" });
    } catch (error) {
        console.error("Could not unlink GitHub repository:", error.message);
        return res.status(500).json({ message: "could not unlink GitHub repository" });
    }
};

const getContributionInputs = (settledResult, normalize) => {
    if (settledResult.status !== "fulfilled") return { records: [], truncated: false, failed: true };
    const { items, truncated } = settledResult.value;
    return { records: items.map(normalize).filter(Boolean), truncated, failed: false };
};

export const synchronizeGitHubEvidence = async (req, res) => {
    let project;
    try {
        const [user, ownedProject] = await Promise.all([
            User.findById(req.user.id).select("githubId"),
            getOwnedProject(req.params.projectId, req.user.id)
        ]);
        project = ownedProject;
        if (!project) return res.status(404).json({ message: "project not found" });
        if (!user?.githubId) {
            return res.status(409).json({ message: "Connect a GitHub account before synchronizing evidence." });
        }
        if (!project.githubRepository?.id) {
            return res.status(400).json({ message: "Link a public GitHub repository before synchronizing." });
        }
        if (project.githubRepository.private) {
            return res.status(400).json({ message: "Private repository synchronization is not supported." });
        }

        const repository = await getPublicRepository({
            owner: project.githubRepository.ownerLogin,
            repository: project.githubRepository.name
        });
        if (repository.private || String(repository.id) !== project.githubRepository.id ||
            String(repository.owner?.id) !== user.githubId) {
            return res.status(403).json({ message: "The linked GitHub repository is no longer a supported public repository owned by your connected account." });
        }
        project.githubRepository = publicRepositoryData(repository);

        const results = await getRepositoryEvidence({
            owner: repository.owner.login,
            repository: repository.name
        });
        const commits = getContributionInputs(results.commits, normalizeCommitEvidence);
        const pullRequests = getContributionInputs(results.pullRequests, normalizePullRequestEvidence);
        const normalized = [...new Map(
            [...commits.records, ...pullRequests.records]
                .map((item) => [`${item.githubUserId}:${item.type}:${item.externalId}`, item])
        ).values()];
        const githubIds = [...new Set(normalized.map((item) => item.githubUserId))];
        const users = githubIds.length
            ? await User.find({ githubId: { $in: githubIds } }).select("_id githubId").lean()
            : [];
        const userIdByGitHubId = new Map(users.map((entry) => [entry.githubId, entry._id]));
        const attributable = normalized.filter((item) => userIdByGitHubId.has(item.githubUserId));
        const operations = attributable.map((item) => {
            const { githubUserId, ...record } = item;
            return {
                updateOne: {
                    filter: {
                        user: userIdByGitHubId.get(githubUserId),
                        project: project._id,
                        repositoryId: project.githubRepository.id,
                        type: record.type,
                        externalId: record.externalId
                    },
                    update: {
                        $set: {
                            ...record,
                            user: userIdByGitHubId.get(githubUserId),
                            project: project._id,
                            repositoryId: project.githubRepository.id,
                            source: "github",
                            attributionGithubId: githubUserId
                        }
                    },
                    upsert: true
                }
            };
        });

        try {
            if (operations.length) {
                await ContributionEvidence.init();
                await ContributionEvidence.bulkWrite(operations, { ordered: false });
            }
        } catch (error) {
            project.githubSync = { lastSyncedAt: new Date(), status: "failed" };
            await project.save();
            console.error("Could not store GitHub evidence:", error.message);
            return res.status(500).json({ message: "GitHub data was retrieved but could not be stored." });
        }

        const failedTypes = [
            ...(commits.failed ? ["commits"] : []),
            ...(pullRequests.failed ? ["pullRequests"] : [])
        ];
        const status = failedTypes.length === 2 ? "failed" : failedTypes.length ? "partial" : "success";
        project.githubSync = { lastSyncedAt: new Date(), status };
        await project.save();
        await DiscoveredRepository.updateOne(
            { user: req.user.id, githubRepositoryId: project.githubRepository.id },
            {
                $set: {
                    contributionStatus: attributable.length
                        ? "verified"
                        : failedTypes.length
                            ? "failed"
                            : "no_match",
                    contributionTypes: [...new Set(attributable.map((item) => item.type))],
                    contributionCheckedAt: new Date()
                }
            }
        ).catch((error) => {
            console.error("Could not update discovered repository contribution status:", error.message);
        });
        if (status === "failed") {
            const error = results.commits.reason || results.pullRequests.reason;
            return sendGitHubError(res, error || new GitHubApiError("GitHub evidence synchronization failed.", 502));
        }

        return res.status(200).json({
            message: status === "success" ? "GitHub evidence synchronized." : "GitHub evidence synchronization completed partially.",
            data: {
                status,
                processed: attributable.length,
                omittedUnattributed: normalized.length - attributable.length,
                omittedInvalid: (commits.failed ? 0 : results.commits.value.items.length - commits.records.length) +
                    (pullRequests.failed ? 0 : results.pullRequests.value.items.length - pullRequests.records.length),
                pagesTruncated: { commits: commits.truncated, pullRequests: pullRequests.truncated },
                failedTypes
            }
        });
    } catch (error) {
        if (project) {
            project.githubSync = { lastSyncedAt: new Date(), status: "failed" };
            await project.save().catch((saveError) => {
                console.error("Could not record GitHub sync failure:", saveError.message);
            });
        }
        return sendGitHubError(res, error);
    }
};

export const getMyEvidence = async (req, res) => {
    try {
        const evidence = await ContributionEvidence.find({ user: req.user.id })
            .sort({ occurredAt: -1 })
            .limit(100)
            .populate("project", "title")
            .lean();
        return res.status(200).json({
            data: evidence.map((item) => ({
                type: item.type,
                title: item.title,
                url: item.url,
                status: item.status,
                occurredAt: item.occurredAt,
                source: item.source,
                projectTitle: item.project?.title || ""
            }))
        });
    } catch (error) {
        console.error("Could not load contribution evidence:", error.message);
        return res.status(500).json({ message: "could not load contribution evidence" });
    }
};
