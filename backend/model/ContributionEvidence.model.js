import mongoose from "mongoose";

const contributionEvidenceSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
         ref: "User", 
         required: true 
        },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    repositoryId: { 
        type: String,
         required: true
         },
    type: { 
        type: String,
         enum: ["commit", "pull_request"],
         required: true
         },
    externalId: {
         type: String,
          required: true
         },
    title: { 
        type: String,
         required: true,
          maxlength: 300
         },
    url: { 
        type: String,
         required: true,
          maxlength: 2048 
        },
    status: { 
        type: String, 
        enum: ["recorded", "open", "closed", "merged"], required: true
     },
    occurredAt: { 
        type: Date,
         required: true
         },
    source: { 
        type: String,
         enum: ["github"], 
         default: "github",
          required: true 
        },
    attributionGithubId: { type: String, required: true }
}, { timestamps: true });

contributionEvidenceSchema.index(
    { user: 1, project: 1, repositoryId: 1, type: 1, externalId: 1 },
    { unique: true }
);
contributionEvidenceSchema.index({ user: 1, occurredAt: -1 });
contributionEvidenceSchema.index({ project: 1, occurredAt: -1 });

const ContributionEvidence = mongoose.model("ContributionEvidence", contributionEvidenceSchema);
export default ContributionEvidence;
