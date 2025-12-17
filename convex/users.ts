import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrGetUser = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            return existingUser;
        }

        const userId = await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
        });

        return await ctx.db.get(userId);
    },
});

export const updateUserRole = mutation({
    args: {
        clerkId: v.string(),
        role: v.union(v.literal("admin"), v.literal("employee")),
        teamName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        if (args.role === "admin" && args.teamName) {
            // Create team for admin
            const teamId = await ctx.db.insert("teams", {
                name: args.teamName,
                adminId: user._id,
            });

            await ctx.db.patch(user._id, {
                role: args.role,
                teamId: teamId,
            });
        } else {
            await ctx.db.patch(user._id, {
                role: args.role,
            });
        }

        return await ctx.db.get(user._id);
    },
});

export const getCurrentUser = query({
    args: { clerkId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.clerkId) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .first();

        return user;
    },
});

export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});
