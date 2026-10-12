import mongoose from "mongoose";

const discoveredRepositorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    githubRepositoryId: { type: String, required: true },
    githubOwnerId: { type: String, required: true },
    ownerLogin: { type: String, required: true, maxlength: 39 },
    name: { type: String, required: true, maxlength: 100 },
    fullName: { type: String, required: true, maxlength: 200 },
    url: { type: String, required: true, maxlength: 2048 },
    description: { type: String, maxlength: 2000, default: "" },
    visibility: {
      type: String,
      enum: ["public"],
      default: "public",
      required: true,
    },
    defaultBranch: { type: String, maxlength: 255, default: "" },
    primaryLanguage: { type: String, maxlength: 100, default: "" },
    topics: { type: [{ type: String, maxlength: 100 }], default: [] },
    githubCreatedAt: Date,
    githubUpdatedAt: Date,
    archived: { type: Boolean, default: false },
    fork: { type: Boolean, default: false },
    ownership: {
      type: String,
      enum: ["owned"],
      default: "owned",
      required: true,
    },
    contributionStatus: {
      type: String,
      enum: ["not_checked", "verified", "no_match", "failed"],
      default: "not_checked",
    },
    contributionTypes: {
      type: [{ type: String, enum: ["commit", "pull_request"] }],
      default: [],
    },
    contributionCheckedAt: Date,
    linkedProject: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    lastSeenAt: { type: Date, required: true },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

discoveredRepositorySchema.index(
  { user: 1, githubRepositoryId: 1 },
  { unique: true },
);
discoveredRepositorySchema.index({ user: 1, available: 1, fullName: 1 });
discoveredRepositorySchema.index(
  { user: 1, linkedProject: 1 },
  {
    unique: true,
    partialFilterExpression: { linkedProject: { $type: "objectId" } },
  },
);

const DiscoveredRepository = mongoose.model(
  "DiscoveredRepository",
  discoveredRepositorySchema,
);
export default DiscoveredRepository;
