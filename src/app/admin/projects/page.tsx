"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ProjectsPage() {
    const { user } = useUser();
    const [projectName, setProjectName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const projects = useQuery(api.projects.getProjects, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const createProject = useMutation(api.projects.createProject);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim() || !currentUser?.teamId) return;

        setIsCreating(true);
        try {
            await createProject({
                name: projectName.trim(),
                teamId: currentUser.teamId,
            });
            setProjectName("");
            setDialogOpen(false);
        } catch (error) {
            console.error("Error creating project:", error);
        }
        setIsCreating(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your team's projects
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>New Project</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Project</DialogTitle>
                            <DialogDescription>
                                Add a new project to organize your team's tasks.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateProject}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Website Redesign"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!projectName.trim() || isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Projects Grid */}
            {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <Link key={project._id} href={`/admin/projects/${project._id}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                                <CardHeader>
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                    <CardDescription>
                                        Created {new Date(project.createdAt).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="p-12 text-center text-muted-foreground">
                        <p className="mb-4">No projects yet.</p>
                        <Button onClick={() => setDialogOpen(true)}>
                            Create Your First Project
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
