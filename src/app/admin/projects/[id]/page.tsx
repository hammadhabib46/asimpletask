"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ProjectDetailPage() {
    const { user } = useUser();
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as Id<"projects">;

    const [taskTitle, setTaskTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Task completion modal state
    const [completionModalOpen, setCompletionModalOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<Id<"tasks"> | null>(null);
    const [completionNote, setCompletionNote] = useState("");
    const [isCompleting, setIsCompleting] = useState(false);

    // Reopen task modal state
    const [reopenModalOpen, setReopenModalOpen] = useState(false);
    const [taskToReopen, setTaskToReopen] = useState<Id<"tasks"> | null>(null);
    const [reopenNote, setReopenNote] = useState("");
    const [isReopening, setIsReopening] = useState(false);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const project = useQuery(api.projects.getProject, { projectId });

    const tasks = useQuery(api.tasks.getTasksByProject, { projectId });

    const teamMembers = useQuery(api.teams.getTeamMembers, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const createTask = useMutation(api.tasks.createTask);
    const assignTask = useMutation(api.tasks.assignTask);
    const markDone = useMutation(api.tasks.markTaskDone);
    const markPending = useMutation(api.tasks.markTaskPending);
    const deleteProject = useMutation(api.projects.deleteProject);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;

        setIsCreating(true);
        try {
            await createTask({
                title: taskTitle.trim(),
                projectId,
                createdBy: currentUser?._id,
            });
            setTaskTitle("");
        } catch (error) {
            console.error("Error creating task:", error);
        }
        setIsCreating(false);
    };

    const handleAssign = async (taskId: Id<"tasks">, userId: string) => {
        if (userId === "unassigned") {
            await assignTask({ taskId, userId: undefined });
        } else {
            await assignTask({ taskId, userId: userId as Id<"users"> });
        }
    };

    const handleToggleStatus = async (taskId: Id<"tasks">, currentStatus: string) => {
        if (currentStatus === "done") {
            // Open reopen modal
            setTaskToReopen(taskId);
            setReopenNote("");
            setReopenModalOpen(true);
        } else {
            // Open completion modal for note
            setTaskToComplete(taskId);
            setCompletionNote("");
            setCompletionModalOpen(true);
        }
    };

    const handleConfirmCompletion = async () => {
        if (!taskToComplete || !currentUser) return;

        setIsCompleting(true);
        try {
            await markDone({
                taskId: taskToComplete,
                completedBy: currentUser._id,
                note: completionNote.trim() || undefined,
            });
            toast.success("Task completed successfully");
            setCompletionModalOpen(false);
            setTaskToComplete(null);
            setCompletionNote("");
        } catch (error: any) {
            console.error("Error completing task:", error);
            toast.error(error.message || "Failed to complete task");
        }
        setIsCompleting(false);
    };

    const handleConfirmReopen = async () => {
        if (!taskToReopen || !currentUser) return;

        setIsReopening(true);
        try {
            await markPending({
                taskId: taskToReopen,
                userId: currentUser._id,
                note: reopenNote.trim() || undefined,
            });
            toast.success("Task reopened successfully");
            setReopenModalOpen(false);
            setTaskToReopen(null);
            setReopenNote("");
        } catch (error: any) {
            console.error("Error reopening task:", error);
            toast.error(error.message || "Failed to reopen task");
        }
        setIsReopening(false);
    };

    const handleDeleteProject = async () => {
        if (!confirm("Are you sure? This will delete all tasks in this project.")) return;
        await deleteProject({ projectId });
        router.push("/admin/projects");
    };

    if (!project) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {project.name}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleDeleteProject}>
                        Delete Project
                    </Button>
                </div>

                {/* Add Task */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Task</CardTitle>
                        <CardDescription>
                            Create a new task for this project
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTask} className="flex gap-3">
                            <Input
                                placeholder="Task title..."
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="max-w-sm"
                            />
                            <Button type="submit" disabled={!taskTitle.trim() || isCreating}>
                                {isCreating ? "Adding..." : "Add Task"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Tasks Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks</CardTitle>
                        <CardDescription>
                            {tasks?.length ?? 0} tasks in this project
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tasks && tasks.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">Done</TableHead>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Assigned To</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Completed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task._id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={task.status === "done"}
                                                    onCheckedChange={() =>
                                                        handleToggleStatus(task._id, task.status)
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={
                                                            task.status === "done"
                                                                ? "line-through text-muted-foreground"
                                                                : ""
                                                        }
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {task.status === "done" && (
                                                        <div className="flex items-center gap-1">
                                                            <Badge variant="secondary" className="text-xs">
                                                                Done
                                                            </Badge>
                                                            {task.completionNote && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <MessageSquare className="w-4 h-4 text-muted-foreground cursor-help" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-sm">{task.completionNote}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={task.assignedTo ?? "unassigned"}
                                                    onValueChange={(value) => handleAssign(task._id, value)}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {teamMembers?.map((member) => (
                                                            <SelectItem key={member._id} value={member._id}>
                                                                {member.name ?? member.email}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(task.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {task.completedAt
                                                    ? new Date(task.completedAt).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No tasks yet. Add one using the form above.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Completion Note Modal */}
                <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Complete Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="completion-note">
                                    Add a note (optional)
                                </Label>
                                <Textarea
                                    id="completion-note"
                                    placeholder="What did you accomplish?"
                                    value={completionNote}
                                    onChange={(e) => setCompletionNote(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setCompletionModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmCompletion}
                                    disabled={isCompleting}
                                >
                                    {isCompleting ? "Completing..." : "Mark Complete"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Reopen Note Modal */}
                <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Reopen Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="reopen-note">
                                    Reason for reopening (optional)
                                </Label>
                                <Textarea
                                    id="reopen-note"
                                    placeholder="Why is this task being reopened?"
                                    value={reopenNote}
                                    onChange={(e) => setReopenNote(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setReopenModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmReopen}
                                    disabled={isReopening}
                                >
                                    {isReopening ? "Reopening..." : "Reopen Task"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider >
    );
}
