import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getTeam = query({
    args: { teamId: v.optional(v.id("teams")) },
    handler: async (ctx, args) => {
        if (!args.teamId) return null;
        return await ctx.db.get(args.teamId);
    },
});

export const getTeamMembers = query({
    args: { teamId: v.optional(v.id("teams")) },
    handler: async (ctx, args) => {
        if (!args.teamId) return [];

        return await ctx.db
            .query("users")
            .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
            .collect();
    },
});

export const addMemberByEmail = mutation({
    args: {
        email: v.string(),
        teamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        // Check if user exists with this email
        let user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (user) {
            // Update existing user to join this team
            await ctx.db.patch(user._id, {
                teamId: args.teamId,
                role: user.role || "employee",
            });
            return user._id;
        } else {
            // Create a placeholder user with this email
            const userId = await ctx.db.insert("users", {
                clerkId: `pending_${args.email}`,
                email: args.email,
                role: "employee",
                teamId: args.teamId,
            });
            return userId;
        }
    },
});

export const removeMember = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!currentUser || currentUser.role !== "admin" || !currentUser.teamId) {
            throw new Error("Unauthorized");
        }

        const userToRemove = await ctx.db.get(args.userId);
        if (!userToRemove) {
            throw new Error("User not found");
        }

        if (userToRemove.teamId !== currentUser.teamId) {
            throw new Error("User is not in your team");
        }

        await ctx.db.patch(args.userId, {
            teamId: undefined,
        });
    },
});
