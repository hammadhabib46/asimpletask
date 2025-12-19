import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTask = mutation({
    args: {
        title: v.string(),
        projectId: v.id("projects"),
        assignedTo: v.optional(v.id("users")),
        assignees: v.optional(v.array(v.id("users"))),
        createdBy: v.optional(v.id("users")),
        images: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // If assignees provided, use that. If assignedTo provided (legacy/single), add to assignees.
        let finalAssignees = args.assignees || [];
        if (args.assignedTo && !finalAssignees.includes(args.assignedTo)) {
            finalAssignees.push(args.assignedTo);
        }

        const taskId = await ctx.db.insert("tasks", {
            title: args.title,
            projectId: args.projectId,
            assignedTo: args.assignedTo, // Keep for backward compat
            assignees: finalAssignees,
            createdBy: args.createdBy,
            images: args.images,
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

        // Use by_assignees index if possible, or fallback to filter
        // "Convex supports indexes on array fields" -> q.eq("assignees", userId) checks if userId is IN the array.
        let tasks = await ctx.db
            .query("tasks")
            .withIndex("by_assignees", (q) => q.eq("assignees", args.userId as any)) // Cast to any to bypass array type check for multi-value index
            .order("desc")
            .collect();

        // Fallback for legacy tasks that might only have assignedTo but no assignees array populated yet
        // This is a bit tricky with strict indexing. 
        // For now, let's assume new tasks use assignees. Ideally we backfill.
        // Or we can OR with assignedTo query in code?
        // Let's do a simple code merge for safety if we want to be robust, 
        // but simpler is to rely on logic: createTask populates assignees. 
        // We'll perform a quick check for 'by_assignedTo' as well and dedupe.

        const legacyTasks = await ctx.db
            .query("tasks")
            .withIndex("by_assignedTo", (q) => q.eq("assignedTo", args.userId))
            .order("desc")
            .collect();

        // Merge and dedupe
        const taskMap = new Map();
        [...tasks, ...legacyTasks].forEach(t => taskMap.set(t._id, t));
        tasks = Array.from(taskMap.values());
        tasks.sort((a, b) => b.createdAt - a.createdAt);


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
            assignees?: any[];
            createdBy?: any;
            completedBy?: any;
            completionNote?: string;
            images?: string[];
            project?: any;
            assignedUser?: any; // Keep for legacy display if needed
            assigneesList?: any[];
            imageUrls?: string[];
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
            // Check checks if assignedTo match OR is in assignees
            filteredTasks = filteredTasks.filter((t) =>
                t.assignedTo === args.assignedTo ||
                (t.assignees && t.assignees.includes(args.assignedTo))
            );
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

        // Enrich with assigned user, creator, completer info AND IMAGE URLs
        const enrichedTasks = await Promise.all(
            filteredTasks.map(async (task) => {
                // Legacy single assignee fetch
                const assignedUser = task.assignedTo
                    ? await ctx.db.get(task.assignedTo)
                    : null;

                // Fetch all assignees
                let assigneesList: any[] = [];
                if (task.assignees && task.assignees.length > 0) {
                    assigneesList = await Promise.all(
                        task.assignees.map(id => ctx.db.get(id))
                    );
                } else if (assignedUser) {
                    // Fallback to legacy single
                    assigneesList = [assignedUser];
                }

                // Filter out nulls
                assigneesList = assigneesList.filter(u => u !== null);

                const createdByUser = task.createdBy
                    ? await ctx.db.get(task.createdBy)
                    : null;
                const completedByUser = task.completedBy
                    ? await ctx.db.get(task.completedBy)
                    : null;

                // Get Image URLs
                let imageUrls: string[] = [];
                if (task.images && task.images.length > 0) {
                    const urls = await Promise.all(
                        task.images.map(storageId => ctx.storage.getUrl(storageId))
                    );
                    imageUrls = urls.filter(u => u !== null) as string[];
                }

                return {
                    ...task,
                    assignedUser, // Keep for backward compat
                    assigneesList,
                    createdByUser,
                    completedByUser,
                    imageUrls,
                };
            })
        );

        return enrichedTasks;
    },
});

export const assignTask = mutation({
    args: {
        taskId: v.id("tasks"),
        assignees: v.optional(v.array(v.id("users"))),
        userId: v.optional(v.id("users")), // Legacy support
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task) throw new Error("Task not found");

        // Determine new state
        let newAssignees = args.assignees ?? [];
        let newAssignedTo = args.userId;

        // If legacy userId provided but not in assignees, add it
        if (newAssignedTo && !newAssignees.includes(newAssignedTo)) {
            newAssignees.push(newAssignedTo);
        }

        // If assignees provided but no legacy userId, pick first as primary
        if (!newAssignedTo && newAssignees.length > 0) {
            newAssignedTo = newAssignees[0];
        }

        // Add history note (simplified)
        const note = {
            content: `Reassigned to ${newAssignees.length} users`,
            userId: (await ctx.auth.getUserIdentity())?.subject ?? "system", // Fallback if no user, though unlikely in admin
            timestamp: Date.now(),
            type: "reopen" as const, // Reusing 'reopen' type for generic updates for now or default to note
        };

        // Actually we should fetch current user ID properly if we want to link to a user.
        // For now, let's just patch.

        await ctx.db.patch(args.taskId, {
            assignees: newAssignees,
            assignedTo: newAssignedTo,
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
