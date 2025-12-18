"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function NotificationsHandler() {
    const { user } = useUser();
    const processedTasksRef = useRef<Set<string>>(new Set());
    const isFirstRun = useRef(true);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    // Watch for my tasks (Employee view)
    const myTasks = useQuery(api.tasks.getMyTasks, {
        userId: currentUser?._id,
    });

    // Watch for all tasks (Admin view) - only if admin
    const adminTasks = useQuery(api.tasks.getAllTasksForAdmin, {
        teamId: currentUser?.role === "admin" ? currentUser.teamId : undefined,
    });

    useEffect(() => {
        if (!("Notification" in window)) return;
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Handle Employee Notifications (New Assignments)
    useEffect(() => {
        if (!myTasks || !currentUser || currentUser.role !== "employee") return;

        // Skip notification on initial load
        if (isFirstRun.current) {
            myTasks.forEach(t => processedTasksRef.current.add(t._id));
            isFirstRun.current = false;
            return;
        }

        myTasks.forEach((task) => {
            if (!processedTasksRef.current.has(task._id)) {
                // New task found!
                processedTasksRef.current.add(task._id);

                // Send browser notification
                if (Notification.permission === "granted") {
                    new Notification("New Task Assigned", {
                        body: `You have been assigned: ${task.title}`,
                        icon: "/favicon.ico"
                    });
                } else {
                    toast.info(`New task assigned: ${task.title}`);
                }
            }
        });
    }, [myTasks, currentUser]);

    // Handle Admin Notifications (Task Completions)
    // We need a separate tracking for admin to detect status changes to 'done'
    const knownDoneTasksRef = useRef<Set<string>>(new Set());
    const adminFirstRun = useRef(true);

    useEffect(() => {
        if (!adminTasks || !currentUser || currentUser.role !== "admin") return;

        if (adminFirstRun.current) {
            adminTasks.forEach(t => {
                if (t.status === "done") knownDoneTasksRef.current.add(t._id);
            });
            adminFirstRun.current = false;
            return;
        }

        adminTasks.forEach((task) => {
            if (task.status === "done" && !knownDoneTasksRef.current.has(task._id)) {
                // Task just marked done
                knownDoneTasksRef.current.add(task._id);

                if (Notification.permission === "granted") {
                    const completerName = (task as any).completedByUser?.name ?? "An employee";
                    new Notification("Task Completed", {
                        body: `${completerName} completed: ${task.title}`,
                        icon: "/favicon.ico"
                    });
                } else {
                    toast.success(`Task completed: ${task.title}`);
                }
            }
        });
    }, [adminTasks, currentUser]);

    return null; // Headless component
}
