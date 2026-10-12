import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["Active", "Completed", "Archived"], default: "Active" },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    featured: { type: Boolean, default: false },
    technologies: {
        type: [{ type: String, trim: true, maxlength: 40 }],
        default: [],
        validate: {
            validator: (items) => items.length <= 20,
            message: "A project can have at most 20 technologies"
        }
    },
    githubRepository: {
        type: new mongoose.Schema({
            id: String,
            ownerId: String,
            ownerLogin: String,
            name: String,
            fullName: String,
            url: String,
            defaultBranch: String,
            private: { type: Boolean, default: false }
        }, { _id: false }),
        default: undefined
    },
    githubSync: {
        lastSyncedAt: Date,
        status: { type: String, enum: ["success", "partial", "failed"] }
    }
}, { timestamps: true });

projectSchema.index({ owner: 1, visibility: 1, featured: -1, createdAt: -1 });

const project = mongoose.model("Project", projectSchema);
export default project;