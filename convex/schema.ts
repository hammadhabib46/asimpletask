import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("employee"))),
    teamId: v.optional(v.id("teams")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_teamId", ["teamId"]),

  teams: defineTable({
    name: v.string(),
    adminId: v.id("users"),
  }),

  projects: defineTable({
    name: v.string(),
    teamId: v.id("teams"),
    createdAt: v.number(),
  }).index("by_teamId", ["teamId"]),

  tasks: defineTable({
    title: v.string(),
    projectId: v.id("projects"),
    assignedTo: v.optional(v.id("users")),
    assignees: v.optional(v.array(v.id("users"))),
    status: v.union(v.literal("pending"), v.literal("done")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    completionNote: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    images: v.optional(v.array(v.string())),
    notes: v.optional(v.array(v.object({
      content: v.string(),
      userId: v.id("users"),
      timestamp: v.number(),
      type: v.union(v.literal("completion"), v.literal("reopen"), v.literal("comment")),
      images: v.optional(v.array(v.string())),
    }))),
  })
    .index("by_projectId", ["projectId"])
    .index("by_assignedTo", ["assignedTo"])
    .index("by_assignees", ["assignees"])
    .index("by_status", ["status"]),
});
