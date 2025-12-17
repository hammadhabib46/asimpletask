"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function SelectRolePage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<"admin" | "employee" | null>(null);
    const [teamName, setTeamName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const createOrGetUser = useMutation(api.users.createOrGetUser);
    const updateUserRole = useMutation(api.users.updateUserRole);

    // Create user record when component mounts
    useEffect(() => {
        if (user && isLoaded) {
            createOrGetUser({
                clerkId: user.id,
                email: user.primaryEmailAddress?.emailAddress ?? "",
                name: user.fullName ?? undefined,
            });
        }
    }, [user, isLoaded, createOrGetUser]);

    // Redirect if user already has a role
    useEffect(() => {
        if (currentUser?.role) {
            if (currentUser.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/employee/tasks");
            }
        }
    }, [currentUser, router]);

    const handleSubmit = async () => {
        if (!user || !selectedRole) return;
        if (selectedRole === "admin" && !teamName.trim()) return;

        setIsSubmitting(true);

        try {
            await updateUserRole({
                clerkId: user.id,
                role: selectedRole,
                teamName: selectedRole === "admin" ? teamName : undefined,
            });

            if (selectedRole === "admin") {
                router.push("/admin");
            } else {
                router.push("/employee/tasks");
            }
        } catch (error) {
            console.error("Error updating role:", error);
            setIsSubmitting(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-semibold">Welcome to TaskFlow</CardTitle>
                    <CardDescription>
                        Choose how you'd like to use the app
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setSelectedRole("admin")}
                            className={`p-6 rounded-lg border-2 transition-all text-left ${selectedRole === "admin"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                        >
                            <div className="font-medium mb-1">Admin</div>
                            <div className="text-sm text-muted-foreground">
                                Create teams, projects, and assign tasks
                            </div>
                        </button>
                        <button
                            onClick={() => setSelectedRole("employee")}
                            className={`p-6 rounded-lg border-2 transition-all text-left ${selectedRole === "employee"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                        >
                            <div className="font-medium mb-1">Employee</div>
                            <div className="text-sm text-muted-foreground">
                                View and complete assigned tasks
                            </div>
                        </button>
                    </div>

                    {selectedRole === "admin" && (
                        <div className="space-y-2">
                            <Label htmlFor="teamName">Team Name</Label>
                            <Input
                                id="teamName"
                                placeholder="Enter your team name"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                            />
                        </div>
                    )}

                    <Button
                        className="w-full"
                        disabled={
                            !selectedRole ||
                            (selectedRole === "admin" && !teamName.trim()) ||
                            isSubmitting
                        }
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? "Setting up..." : "Continue"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
