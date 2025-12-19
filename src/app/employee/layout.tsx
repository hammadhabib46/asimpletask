"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { Button } from "@/components/ui/button";

export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded } = useUser();
    const router = useRouter();

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    // Enable real-time task notifications
    const { permission, requestPermission, hasPermission } = useTaskNotifications(
        currentUser?._id
    );

    useEffect(() => {
        if (isLoaded && currentUser) {
            if (currentUser.role === "admin") {
                router.push("/admin");
            }
        }
    }, [isLoaded, currentUser, router]);

    if (!isLoaded || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top Navigation */}
            <nav className="border-b border-border bg-background">
                <div className="w-full mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/employee/tasks" className="font-semibold text-xl">
                        TaskFlow
                    </Link>
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        {permission === "default" ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={requestPermission}
                                title="Enable notifications"
                                className="relative"
                            >
                                <BellOff className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        ) : hasPermission ? (
                            <div className="relative" title="Notifications enabled">
                                <Bell className="h-5 w-5 text-green-500" />
                            </div>
                        ) : (
                            <div className="relative" title="Notifications blocked">
                                <BellOff className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                        <span className="text-sm text-muted-foreground">
                            {currentUser.email}
                        </span>
                        <UserButton afterSwitchSessionUrl="/" />
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 bg-background">
                <div className="w-full mx-auto px-4 py-8">{children}</div>
            </main>
        </div>
    );
}

