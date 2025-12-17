"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
    requestNotificationPermission,
    showNotification,
    getNotificationPermission,
    type NotificationPermission,
} from "@/lib/notifications";

interface Task {
    _id: Id<"tasks">;
    title: string;
    createdAt: number;
    project?: { name: string } | null;
}

/**
 * Hook that watches for new task assignments and shows browser notifications
 * Use this in the employee layout to get real-time notifications
 */
export function useTaskNotifications(userId: Id<"users"> | undefined) {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const seenTaskIds = useRef<Set<string>>(new Set());
    const isInitialLoad = useRef(true);

    // Fetch tasks assigned to current user
    const tasks = useQuery(
        api.tasks.getMyTasks,
        userId ? { userId } : "skip"
    );

    // Request permission on mount
    useEffect(() => {
        setPermission(getNotificationPermission());
    }, []);

    const requestPermission = useCallback(async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
        return result;
    }, []);

    // Watch for new tasks and show notifications
    useEffect(() => {
        if (!tasks || !userId) return;

        // On initial load, just mark all existing tasks as seen
        if (isInitialLoad.current) {
            tasks.forEach((task) => seenTaskIds.current.add(task._id));
            isInitialLoad.current = false;
            return;
        }

        // Check for new tasks
        const newTasks = tasks.filter((task) => !seenTaskIds.current.has(task._id));

        if (newTasks.length > 0 && permission === "granted") {
            newTasks.forEach((task: Task) => {
                showNotification("New Task Assigned", {
                    body: `${task.title}${task.project ? ` - ${task.project.name}` : ""}`,
                    tag: `task-${task._id}`,
                    onClick: () => {
                        window.location.href = "/employee/tasks";
                    },
                });
                seenTaskIds.current.add(task._id);
            });
        } else {
            // Still mark as seen even if we can't show notifications
            newTasks.forEach((task) => seenTaskIds.current.add(task._id));
        }
    }, [tasks, userId, permission]);

    return {
        permission,
        requestPermission,
        hasPermission: permission === "granted",
    };
}
