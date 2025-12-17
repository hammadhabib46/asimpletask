import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createProject = mutation({
    args: {
        name: v.string(),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        const projectId = await ctx.db.insert("projects", {
            name: args.name,
            teamId: args.teamId,
            createdAt: Date.now(),
        });
        return projectId;
    },
});

export const getProjects = query({
    args: { teamId: v.optional(v.id("teams")) },
    handler: async (ctx, args) => {
        if (!args.teamId) return [];

        return await ctx.db
            .query("projects")
            .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId!))
            .order("desc")
            .collect();
    },
});

export const getProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.projectId);
    },
});

export const deleteProject = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        // Delete all tasks in the project first
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();

        for (const task of tasks) {
            await ctx.db.delete(task._id);
        }

        await ctx.db.delete(args.projectId);
    },
});
