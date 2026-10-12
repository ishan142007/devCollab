import mongoose from "mongoose";
import Project from "../model/Project.model.js";
import Task from "../model/task.model.js";

const taskFields = ["name", "description", "status", "priority", "assignee"];

const sendError = (res, error) => {
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: "invalid task data", error: error.message });
    }

    return res.status(500).json({ message: "internal server error", error: error.message });
};

const getOwnedProject = async (projectId, owner) => {
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        return null;
    }

    return Project.findOne({ _id: projectId, owner });
};

export const createTask = async (req, res) => {
    try {
        const owner = req.user.id;
        const projectId = req.params.projectId;
        const { name, description, status, priority, assignee } = req.body ?? {};

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "task name is required" });
        }

        const project = await getOwnedProject(projectId, owner);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }

        const normalizedAssignee = typeof assignee === "string" ? assignee.trim() : assignee;
        if (normalizedAssignee && !mongoose.Types.ObjectId.isValid(normalizedAssignee)) {
            return res.status(400).json({ message: "invalid assignee id" });
        }

        const task = await Task.create({
            name: name.trim(),
            description,
            status,
            priority,
            assignee: normalizedAssignee || undefined,
            project: project._id,
            owner
        });

        return res.status(201).json({ message: "task created", task });
    } catch (error) {
        return sendError(res, error);
    }
};

export const getTasks = async (req, res) => {
    try {
        const owner = req.user.id;
        const { projectId } = req.params;

        const project = await getOwnedProject(projectId, owner);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }

        const tasks = await Task.find({ project: project._id, owner }).sort({ createdAt: -1 });
        return res.status(200).json({ message: "tasks retrieved", tasks });
    } catch (error) {
        return sendError(res, error);
    }
};

export const getTaskById = async (req, res) => {
    try {
        const owner = req.user.id;
        const { projectId, taskId } = req.params;

        const project = await getOwnedProject(projectId, owner);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "invalid task id" });
        }

        const task = await Task.findOne({ _id: taskId, project: project._id, owner });
        if (!task) {
            return res.status(404).json({ message: "task not found" });
        }

        return res.status(200).json({ message: "task retrieved", task });
    } catch (error) {
        return sendError(res, error);
    }
};

export const updateTask = async (req, res) => {
    try {
        const owner = req.user.id;
        const { projectId, taskId } = req.params;

        const project = await getOwnedProject(projectId, owner);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "invalid task id" });
        }

        const body = req.body ?? {};
        const update = {};
        for (const field of taskFields) {
            if (body[field] !== undefined) {
                update[field] = body[field];
            }
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "please send valid task changes" });
        }
        if (update.name !== undefined) {
            if (typeof update.name !== "string" || !update.name.trim()) {
                return res.status(400).json({ message: "task name cannot be empty" });
            }
            update.name = update.name.trim();
        }
        if (update.assignee === "") {
            update.assignee = undefined;
        }
        if (update.assignee != null && typeof update.assignee === "string" && update.assignee.trim() === "") {
            update.assignee = undefined;
        }
        if (update.assignee != null && typeof update.assignee === "string" && !mongoose.Types.ObjectId.isValid(update.assignee.trim())) {
            return res.status(400).json({ message: "invalid assignee id" });
        }
        if (update.assignee != null && typeof update.assignee !== "string" && !mongoose.Types.ObjectId.isValid(update.assignee)) {
            return res.status(400).json({ message: "invalid assignee id" });
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, project: project._id, owner },
            update,
            { returnDocument: "after", runValidators: true }
        );
        if (!updatedTask) {
            return res.status(404).json({ message: "task not found" });
        }

        return res.status(200).json({ message: "task updated", updatedTask });
    } catch (error) {
        return sendError(res, error);
    }
};

export const deleteTask = async (req, res) => {
    try {
        const owner = req.user.id;
        const { projectId, taskId } = req.params;

        const project = await getOwnedProject(projectId, owner);
        if (!project) {
            return res.status(404).json({ message: "project not found" });
        }
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "invalid task id" });
        }

        const deletedTask = await Task.findOneAndDelete({
            _id: taskId,
            project: project._id,
            owner
        });
        if (!deletedTask) {
            return res.status(404).json({ message: "task not found" });
        }

        return res.status(200).json({ message: "task deleted", deletedTask });
    } catch (error) {
        return sendError(res, error);
    }
};
