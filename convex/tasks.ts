import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTask = mutation({
    args: {
        title: v.string(),
        projectId: v.id("projects"),
        assignedTo: v.optional(v.id("users")),
        createdBy: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const taskId = await ctx.db.insert("tasks", {
            title: args.title,
            projectId: args.projectId,
            assignedTo: args.assignedTo,
            createdBy: args.createdBy,
            status: "pending",
            createdAt: Date.now(),
        });
        return taskId;
    },
});

export const getTasksByProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();

        // Enrich with assigned user info
        const enrichedTasks = await Promise.all(
            tasks.map(async (task) => {
                const assignedUser = task.assignedTo
                    ? await ctx.db.get(task.assignedTo)
                    : null;
                return {
                    ...task,
                    assignedUser,
                };
            })
        );

        return enrichedTasks;
    },
});

export const getMyTasks = query({
    args: {
        userId: v.optional(v.id("users")),
        searchQuery: v.optional(v.string()),
        projectFilter: v.optional(v.id("projects")),
        dateFrom: v.optional(v.number()),
        dateTo: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!args.userId) return [];

        let tasks = await ctx.db
            .query("tasks")
            .withIndex("by_assignedTo", (q) => q.eq("assignedTo", args.userId))
            .order("desc")
            .collect();

        // Apply project filter
        if (args.projectFilter) {
            tasks = tasks.filter((t) => t.projectId === args.projectFilter);
        }

        // Apply date filter
        if (args.dateFrom) {
            tasks = tasks.filter((t) => t.createdAt >= args.dateFrom!);
        }
        if (args.dateTo) {
            tasks = tasks.filter((t) => t.createdAt <= args.dateTo!);
        }

        // Enrich with project info
        const enrichedTasks = await Promise.all(
            tasks.map(async (task) => {
                const project = await ctx.db.get(task.projectId);
                return {
                    ...task,
                    project,
                };
            })
        );

        // Apply search filter (on title and project name)
        if (args.searchQuery) {
            const query = args.searchQuery.toLowerCase();
            return enrichedTasks.filter(
                (t) =>
                    t.title.toLowerCase().includes(query) ||
                    t.project?.name.toLowerCase().includes(query)
            );
        }

        return enrichedTasks;
    },
});

export const getAllTasksForAdmin = query({
    args: {
        teamId: v.optional(v.id("teams")),
        projectId: v.optional(v.id("projects")),
        assignedTo: v.optional(v.id("users")),
        completedBy: v.optional(v.id("users")), // Added filter
        dateFrom: v.optional(v.number()),
        dateTo: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (!args.teamId) return [];

        // Get all projects for this team
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId!))
            .collect();

        // Get all tasks for these projects
        const allTasks: Array<{
            _id: any;
            title: string;
            projectId: any;
            status: string;
            createdAt: number;
            completedAt?: number;
            assignedTo?: any;
            createdBy?: any;
            completedBy?: any;
            completionNote?: string;
            project?: any;
            assignedUser?: any;
        }> = [];

        for (const project of projects) {
            // Skip if project filter is set and doesn't match
            if (args.projectId && project._id !== args.projectId) continue;

            const tasks = await ctx.db
                .query("tasks")
                .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
                .collect();

            allTasks.push(...tasks.map((t) => ({ ...t, project })));
        }

        // Filter by assignedTo
        let filteredTasks = allTasks;
        if (args.assignedTo) {
            filteredTasks = filteredTasks.filter((t) => t.assignedTo === args.assignedTo);
        }

        // Filter by completedBy
        if (args.completedBy) {
            filteredTasks = filteredTasks.filter((t) => t.completedBy === args.completedBy);
        }

        // Filter by date
        if (args.dateFrom) {
            filteredTasks = filteredTasks.filter((t) => t.createdAt >= args.dateFrom!);
        }
        if (args.dateTo) {
            filteredTasks = filteredTasks.filter((t) => t.createdAt <= args.dateTo!);
        }

        // Sort by createdAt desc
        filteredTasks.sort((a, b) => b.createdAt - a.createdAt);

        // Enrich with assigned user, creator, and completer info
        const enrichedTasks = await Promise.all(
            filteredTasks.map(async (task) => {
                const assignedUser = task.assignedTo
                    ? await ctx.db.get(task.assignedTo)
                    : null;
                const createdByUser = task.createdBy
                    ? await ctx.db.get(task.createdBy)
                    : null;
                const completedByUser = task.completedBy
                    ? await ctx.db.get(task.completedBy)
                    : null;
                return {
                    ...task,
                    assignedUser,
                    createdByUser,
                    completedByUser,
                };
            })
        );

        return enrichedTasks;
    },
});

export const assignTask = mutation({
    args: {
        taskId: v.id("tasks"),
        userId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.taskId, {
            assignedTo: args.userId,
        });
    },
});

export const markTaskDone = mutation({
    args: {
        taskId: v.id("tasks"),
        completedBy: v.optional(v.id("users")),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Task not found");

        const newNote = args.note ? {
            content: args.note,
            userId: args.completedBy!,
            timestamp: Date.now(),
            type: "completion" as const,
        } : null;

        const currentNotes = task.notes || [];

        await ctx.db.patch(args.taskId, {
            status: "done",
            completedAt: Date.now(),
            completedBy: args.completedBy,
            completionNote: args.note,
            notes: newNote ? [...currentNotes, newNote] : currentNotes,
        });
    },
});

export const markTaskPending = mutation({
    args: {
        taskId: v.id("tasks"),
        userId: v.optional(v.id("users")), // Added mainly for the note author
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Task not found");

        const newNote = args.note && args.userId ? {
            content: args.note,
            userId: args.userId,
            timestamp: Date.now(),
            type: "reopen" as const,
        } : null;

        const currentNotes = task.notes || [];

        await ctx.db.patch(args.taskId, {
            status: "pending",
            completedAt: undefined,
            completedBy: undefined,
            completionNote: undefined,
            notes: newNote ? [...currentNotes, newNote] : currentNotes,
        });
    },
});

export const deleteTask = mutation({
    args: { taskId: v.id("tasks") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user || user.role !== "admin") {
            throw new Error("Unauthorized: Only admins can delete tasks");
        }

        await ctx.db.delete(args.taskId);
    },
});
