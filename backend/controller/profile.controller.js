import User from "../model/User.model.js";
import Project from "../model/Project.model.js";
import ContributionEvidence from "../model/ContributionEvidence.model.js";
import { ensureUsername, isHttpsUrl } from "../utils/profile.js";

export const getPublicProfile = async (req, res) => {
    try {
        const username = typeof req.params.username === "string" ? req.params.username.toLowerCase() : "";
        const user = await User.findOne({ username }).select(
            "name username bio avatar profileVisibility technologies githubUsername"
        );
        if (!user || user.profileVisibility !== "public") {
            return res.status(404).json({ message: "profile not found" });
        }

        const projects = await Project.find({ owner: user._id, visibility: "public" })
            .select("title description technologies featured githubRepository status createdAt")
            .sort({ featured: -1, createdAt: -1 })
            .limit(12)
            .lean();
        const linkedRepositories = projects
            .filter((project) => project.githubRepository?.id && project.githubRepository.private === false)
            .map((project) => ({
                projectId: project._id,
                repositoryId: project.githubRepository.id
            }));
        const evidence = linkedRepositories.length
            ? await ContributionEvidence.find({
                user: user._id,
                $or: linkedRepositories.map(({ projectId, repositoryId }) => ({
                    project: projectId,
                    repositoryId
                }))
            })
                .select("project repositoryId type externalId title url status occurredAt source")
                .sort({ occurredAt: -1 })
                .limit(51)
                .lean()
            : [];
        const projectById = new Map(projects.map((project) => [String(project._id), project]));

        return res.status(200).json({
            data: {
                user: {
                    name: user.name,
                    username: user.username,
                    bio: user.bio || "",
                    avatar: isHttpsUrl(user.avatar) ? user.avatar : "",
                    technologies: user.technologies || [],
                    githubUsername: user.githubUsername || "",
                    githubUrl: user.githubUsername ? `https://github.com/${encodeURIComponent(user.githubUsername)}` : ""
                },
                projects: projects.map((project) => ({
                    id: String(project._id),
                    title: project.title,
                    description: project.description || "",
                    technologies: project.technologies || [],
                    featured: Boolean(project.featured),
                    status: project.status,
                    githubRepository: project.githubRepository?.id && project.githubRepository.private === false ? {
                        fullName: project.githubRepository.fullName,
                        url: project.githubRepository.url
                    } : null
                })),
                evidence: evidence.slice(0, 50).map((item) => ({
                    type: item.type,
                    externalId: item.externalId,
                    title: item.title,
                    url: item.url,
                    status: item.status,
                    occurredAt: item.occurredAt,
                    source: item.source,
                    projectId: String(item.project),
                    projectTitle: projectById.get(String(item.project))?.title || ""
                })),
                evidenceTruncated: evidence.length > 50
            }
        });
    } catch (error) {
        console.error("Could not load public profile:", error.message);
        return res.status(500).json({ message: "could not load profile" });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "name username bio avatar profileVisibility technologies githubId githubUsername"
        );
        if (!user) return res.status(404).json({ message: "user not found" });
        await ensureUsername(user);

        const projects = await Project.find({ owner: user._id })
            .select("title description technologies featured visibility status githubRepository githubSync createdAt")
            .sort({ featured: -1, createdAt: -1 })
            .lean();
        const evidence = await ContributionEvidence.find({ user: user._id })
            .select("project type externalId title url status occurredAt source")
            .sort({ occurredAt: -1 })
            .limit(100)
            .populate("project", "title")
            .lean();

        return res.status(200).json({
            data: {
                projects: projects.map((project) => ({
                    id: String(project._id),
                    title: project.title,
                    description: project.description || "",
                    technologies: project.technologies || [],
                    featured: Boolean(project.featured),
                    visibility: project.visibility || "private",
                    status: project.status,
                    githubRepository: project.githubRepository || null,
                    githubSync: project.githubSync || null
                })),
                evidence: evidence.map((item) => ({
                    type: item.type,
                    externalId: item.externalId,
                    title: item.title,
                    url: item.url,
                    status: item.status,
                    occurredAt: item.occurredAt,
                    source: item.source,
                    projectTitle: item.project?.title || ""
                }))
            }
        });
    } catch (error) {
        console.error("Could not load profile settings:", error.message);
        return res.status(500).json({ message: "could not load profile data" });
    }
};
