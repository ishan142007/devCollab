import express from "express";
import verifyToken from "../middleware/auth.middleware.js";
import { getMyProfile, getPublicProfile } from "../controller/profile.controller.js";
import { getMyEvidence, linkGitHubRepository, synchronizeGitHubEvidence, unlinkGitHubRepository } from "../controller/githubEvidence.controller.js";
import {
    getMyGitHubRepositories,
    linkDiscoveredRepository,
    refreshMyGitHubRepositories,
    verifyDiscoveredRepositoryContributions
} from "../controller/githubRepository.controller.js";

const profileRouter = express.Router();

profileRouter.get("/profiles/:username", getPublicProfile);
profileRouter.get("/profile/me", verifyToken, getMyProfile);
profileRouter.get("/evidence/me", verifyToken, getMyEvidence);
profileRouter.post("/project/:projectId/github/repository", verifyToken, linkGitHubRepository);
profileRouter.delete("/project/:projectId/github/repository", verifyToken, unlinkGitHubRepository);
profileRouter.post("/project/:projectId/github/sync", verifyToken, synchronizeGitHubEvidence);
profileRouter.get("/github/repositories", verifyToken, getMyGitHubRepositories);
profileRouter.post("/github/repositories/refresh", verifyToken, refreshMyGitHubRepositories);
profileRouter.patch("/github/repositories/:repositoryId/link", verifyToken, linkDiscoveredRepository);
profileRouter.post("/github/repositories/:repositoryId/verify", verifyToken, verifyDiscoveredRepositoryContributions);

export default profileRouter;
