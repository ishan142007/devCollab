import mongoose from "mongoose";
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: { type: String, trim: true, lowercase: true, maxlength: 50, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    password: { type: String, select: false },
    avatar: { type: String, trim: true, maxlength: 2048, default: "" },
    bio: { type: String, trim: true, maxlength: 280, default: "" },
    profileVisibility: { type: String, enum: ["public", "private"], default: "private" },
    technologies: {
        type: [{ type: String, trim: true, maxlength: 40 }],
        default: [],
        validate: {
            validator: (items) => items.length <= 20,
            message: "A profile can have at most 20 technologies"
        }
    },
    githubId: { type: String, unique: true, sparse: true },
    githubUsername: { type: String, trim: true, maxlength: 39 },
    githubRepositorySync: {
        status: { type: String, enum: ["never", "in_progress", "success", "partial", "failed"], default: "never" },
        startedAt: Date,
        completedAt: Date,
        message: { type: String, maxlength: 300, default: "" },
        truncated: { type: Boolean, default: false }
    },

}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
export default User;