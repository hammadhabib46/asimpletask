"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    useEffect(() => {
        if (isLoaded && currentUser) {
            if (currentUser.role !== "admin") {
                router.push("/employee/tasks");
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

    const navItems = [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/projects", label: "Projects" },
        { href: "/admin/team", label: "Team" },
        { href: "/admin/performance", label: "Performance" },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top Navigation */}
            <nav className="border-b border-border bg-background">
                <div className="w-full mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin" className="font-semibold text-xl">
                            TaskFlow
                        </Link>
                        <div className="flex items-center gap-1">
                            {navItems.map((item) => (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={pathname === item.href ? "secondary" : "ghost"}
                                        size="sm"
                                    >
                                        {item.label}
                                    </Button>
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
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
