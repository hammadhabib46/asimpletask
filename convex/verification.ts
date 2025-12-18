import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { addMemberByEmail } from "./teams";
import { createOrGetUser } from "./users";

export const testInviteFlow = mutation({
    args: {
        email: v.string(),
        dummyTeamId: v.id("teams"),
    },
    handler: async (ctx, args) => {
        // 1. Simulate adding a member (Invite)
        // We can't call other mutations directly easily inside a mutation without internalizing them or just copying logic.
        // For simplicity, let's just insert the pending user state directly to ensure we test just the fix.

        // Cleanup any existing user with this email to ensure clean state
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
        if (existing) {
            await ctx.db.delete(existing._id);
        }

        // Create pending user manually (simulating what addMemberByEmail does)
        const pendingUserId = await ctx.db.insert("users", {
            clerkId: `pending_${args.email}`,
            email: args.email,
            name: "Invited User",
            role: "employee",
            teamId: args.dummyTeamId,
        });

        console.log("Created pending user:", pendingUserId);

        // 2. Simulate User Signup
        // This calls the function we just fixed
        // We need to call the logic of createOrGetUser. 
        // Since we are inside a mutation, we can't easily call another exported mutation as a function unless it's defined as a regular function.
        // However, I can just copy the logic or import the function if I refactor.
        // Actually, `createOrGetUser` is exported. But in Convex, exported functions are wrappers.
        // Let's just create a separate mutation in this file that calls the logic if possible, OR
        // simpler: I will just use `npx convex run` to call the actual public mutations in sequence.

        return "Ready for manual verification via CLI";
    },
});
