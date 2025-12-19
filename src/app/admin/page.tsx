"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
    const { user } = useUser();
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [assignedToFilter, setAssignedToFilter] = useState<string>("all");

    // Task creation modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskProject, setNewTaskProject] = useState<string>("");
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>("unassigned");
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Task completion modal state
    const [completionModalOpen, setCompletionModalOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<Id<"tasks"> | null>(null);
    const [completionNote, setCompletionNote] = useState("");
    const [isCompleting, setIsCompleting] = useState(false);

    // Task details modal state
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Reopen task modal state (just reusing similar logic to completion, or create a generic one)
    const [reopenModalOpen, setReopenModalOpen] = useState(false);
    const [taskToReopen, setTaskToReopen] = useState<Id<"tasks"> | null>(null);
    const [reopenNote, setReopenNote] = useState("");
    const [isReopening, setIsReopening] = useState(false);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const projects = useQuery(api.projects.getProjects, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const teamMembers = useQuery(api.teams.getTeamMembers, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const createTask = useMutation(api.tasks.createTask);
    const markDone = useMutation(api.tasks.markTaskDone);
    const markPending = useMutation(api.tasks.markTaskPending);
    const reassignTask = useMutation(api.tasks.assignTask);
    const deleteTask = useMutation(api.tasks.deleteTask);
    const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);

    // Calculate date range
    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === "7days") {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return { from: weekAgo.getTime(), to: undefined };
        }
        if (dateFilter === "30days") {
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            return { from: monthAgo.getTime(), to: undefined };
        }
        return { from: undefined, to: undefined };
    }, [dateFilter]);

    const allTasks = useQuery(api.tasks.getAllTasksForAdmin, {
        teamId: currentUser?.teamId ?? undefined,
        projectId: projectFilter !== "all" ? (projectFilter as Id<"projects">) : undefined,
        assignedTo: assignedToFilter !== "all" ? (assignedToFilter as Id<"users">) : undefined,
        dateFrom: dateRange.from,
    });

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !newTaskProject || !currentUser) return;

        setIsCreating(true);
        try {
            // Upload images first
            const imageStorageIds: string[] = [];
            if (selectedImages.length > 0) {
                for (const file of selectedImages) {
                    const postUrl = await generateUploadUrl();
                    const result = await fetch(postUrl, {
                        method: "POST",
                        headers: { "Content-Type": file.type },
                        body: file,
                    });
                    const { storageId } = await result.json();
                    imageStorageIds.push(storageId);
                }
            }

            await createTask({
                title: newTaskTitle.trim(),
                projectId: newTaskProject as Id<"projects">,
                assignedTo: newTaskAssignee !== "unassigned" ? (newTaskAssignee as Id<"users">) : undefined,
                createdBy: currentUser._id,
                images: imageStorageIds.length > 0 ? imageStorageIds : undefined,
            });
            toast.success("Task created successfully");
            // Reset and close modal
            setNewTaskTitle("");
            setNewTaskProject("");
            setNewTaskAssignee("unassigned");
            setSelectedImages([]);
            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error(error.message || "Failed to create task");
        }
        setIsCreating(false);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const newImages: File[] = [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) newImages.push(file);
            }
        }

        if (newImages.length > 0) {
            setSelectedImages(prev => [...prev, ...newImages]);
            toast.success(`Pasted ${newImages.length} image(s)`);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
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

    const handleTaskClick = (task: any) => {
        setSelectedTask(task);
        setDetailsModalOpen(true);
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <h1 className="text-4xl font-black tracking-tighter text-white">Dashboard</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tasks Section - Takes up 2 columns */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-2xl font-bold text-white">Tasks</h2>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Project Filter */}
                                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                                            <SelectTrigger className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-auto gap-2 hover:bg-[#333] transition-colors focus:ring-0 focus:ring-offset-0">
                                                <span className="font-medium">Project</span>
                                                <span className="text-gray-400 truncate max-w-[100px]">
                                                    {projectFilter === "all"
                                                        ? "All"
                                                        : projects?.find(p => p._id === projectFilter)?.name ?? "Selected"}
                                                </span>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                <SelectItem value="all">All Projects</SelectItem>
                                                {projects?.map((project) => (
                                                    <SelectItem key={project._id} value={project._id}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Date Filter */}
                                        <Select value={dateFilter} onValueChange={setDateFilter}>
                                            <SelectTrigger className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-auto hover:bg-[#333] transition-colors focus:ring-0 focus:ring-offset-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                <SelectItem value="all">All Time</SelectItem>
                                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Assigned To Filter */}
                                        <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                                            <SelectTrigger className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-auto gap-2 hover:bg-[#333] transition-colors focus:ring-0 focus:ring-offset-0">
                                                <span className="font-medium">Assigned To</span>
                                                <span className="text-gray-400 truncate max-w-[100px]">
                                                    {assignedToFilter === "all"
                                                        ? "Everyone"
                                                        : teamMembers?.find(m => m._id === assignedToFilter)?.name ?? "Selected"}
                                                </span>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                <SelectItem value="all">Everyone</SelectItem>
                                                {teamMembers?.map((member) => (
                                                    <SelectItem key={member._id} value={member._id}>
                                                        {member.name ?? member.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Task Creation Modal */}
                                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white h-8 text-xs">
                                            <Plus className="w-3 h-3 mr-1" /> Task
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#1C1C1C] border-white/10 text-white max-w-md" onPaste={handlePaste}>
                                        <DialogHeader>
                                            <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 mt-4">
                                            {/* Task Title */}
                                            <div className="space-y-2">
                                                <Label htmlFor="task-title" className="text-gray-300">Task Title</Label>
                                                <Input
                                                    id="task-title"
                                                    placeholder="Enter task title..."
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                                                />
                                            </div>

                                            {/* Project Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-gray-300">Project *</Label>
                                                <Select value={newTaskProject} onValueChange={setNewTaskProject}>
                                                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                                                        <SelectValue placeholder="Select a project" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                        {projects?.map((project) => (
                                                            <SelectItem key={project._id} value={project._id}>
                                                                {project.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Assignee Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-gray-300">Assign To (Optional)</Label>
                                                <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {teamMembers?.map((member) => (
                                                            <SelectItem key={member._id} value={member._id}>
                                                                {member.name ?? member.email}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Image Upload */}
                                            <div className="space-y-2">
                                                <Label className="text-gray-300">Images (Paste or Select)</Label>
                                                <div
                                                    className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                                    onPaste={handlePaste}
                                                    onClick={() => document.getElementById('image-upload')?.click()}
                                                >
                                                    <input
                                                        type="file"
                                                        id="image-upload"
                                                        className="hidden"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleFileSelect}
                                                    />
                                                    <p className="text-sm text-gray-500">
                                                        Click to upload or press <kbd className="bg-white/10 px-1 rounded">Cmd/Ctrl + V</kbd> to paste
                                                    </p>
                                                </div>

                                                {selectedImages.length > 0 && (
                                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                                        {selectedImages.map((file, index) => (
                                                            <div key={index} className="relative group aspect-square rounded-md overflow-hidden bg-black">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={URL.createObjectURL(file)}
                                                                    alt="preview"
                                                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeImage(index);
                                                                    }}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Plus className="w-3 h-3 rotate-45" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Create Button */}
                                            <Button
                                                onClick={handleCreateTask}
                                                disabled={!newTaskTitle.trim() || !newTaskProject || isCreating}
                                                className="w-full bg-white text-black hover:bg-gray-200 mt-2"
                                            >
                                                {isCreating ? "Creating..." : "Create Task"}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Custom Table Implementation to match mock */}
                            <div className="w-full">
                                <div className="grid grid-cols-12 gap-4 text-gray-400 text-sm font-medium mb-4 px-4">
                                    <div className="col-span-1">Done</div>
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-5">Task</div>
                                    <div className="col-span-2">Assigned To</div>
                                    <div className="col-span-2 text-right">Status</div>
                                </div>

                                <div className="space-y-2">
                                    {allTasks && allTasks.length > 0 ? (
                                        allTasks.slice(0, 8).map((task: any) => (
                                            <div
                                                key={task._id}
                                                className="grid grid-cols-12 gap-4 items-center bg-[#252525] hover:bg-[#2A2A2A] transition-colors p-4 rounded-xl text-sm group cursor-pointer"
                                                onClick={() => handleTaskClick(task)}
                                            >
                                                <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={task.status === "done"}
                                                        onCheckedChange={() =>
                                                            handleToggleStatus(task._id, task.status)
                                                        }
                                                        className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                                                    />
                                                </div>
                                                <div className="col-span-2 text-gray-400">
                                                    {new Date(task.createdAt).toLocaleDateString(undefined, {
                                                        day: 'numeric',
                                                        month: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                                    <span className={`font-medium truncate ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                                                        {task.title}
                                                    </span>
                                                    {task.status === 'done' && task.completionNote && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-[#1C1C1C] border-white/10 text-white max-w-xs">
                                                                <p className="text-sm">{task.completionNote}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-gray-400 text-xs">
                                                    {task.assignedUser?.name ?? task.assignedUser?.email?.split('@')[0] ?? "Unassigned"}
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <span className={task.status === 'done' ? "text-white" : "text-gray-500"}>
                                                        {task.status === 'done' ? "Completed" : "Pending"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            No tasks found matching filters
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Section - Takes up 1 column */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5 h-full min-h-[400px]">
                            <h2 className="text-2xl font-bold text-white mb-1">Recent Activity</h2>
                            <p className="text-gray-500 text-sm mb-6">Latest task updates across all projects</p>

                            <div className="space-y-6 relative">
                                {/* Timeline line */}
                                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#252525]" />

                                {allTasks && allTasks.slice(0, 5).map((task: any) => (
                                    <div key={task._id} className="relative pl-8">
                                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-[#1C1C1C] ${task.status === 'done' ? 'bg-white' : 'bg-gray-600'}`} />
                                        <div className="text-sm text-white font-medium">{task.title}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {task.status === 'done' ? (
                                                <>
                                                    Completed by {task.completedByUser?.name ?? task.completedByUser?.email?.split('@')[0] ?? 'Unknown'}
                                                    {task.completionNote && (
                                                        <span className="text-gray-400 italic"> — "{task.completionNote}"</span>
                                                    )}
                                                </>
                                            ) : (
                                                <>Created by {task.createdByUser?.name ?? task.createdByUser?.email?.split('@')[0] ?? 'Unknown'}</>
                                            )}
                                            {' • '}{new Date(task.status === 'done' && task.completedAt ? task.completedAt : task.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}

                                {(!allTasks || allTasks.length === 0) && (
                                    <div className="text-gray-500 text-sm pl-8">No activity yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Completion Note Modal */}
                <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
                    <DialogContent className="bg-[#1C1C1C] border-white/10 text-white max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Complete Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="completion-note" className="text-gray-300">
                                    Add a note (optional)
                                </Label>
                                <Textarea
                                    id="completion-note"
                                    placeholder="What did you accomplish?"
                                    value={completionNote}
                                    onChange={(e) => setCompletionNote(e.target.value)}
                                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setCompletionModalOpen(false)}
                                    className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmCompletion}
                                    disabled={isCompleting}
                                    className="flex-1 bg-white text-black hover:bg-gray-200"
                                >
                                    {isCompleting ? "Completing..." : "Mark Complete"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Reopen Note Modal */}
                <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
                    <DialogContent className="bg-[#1C1C1C] border-white/10 text-white max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Reopen Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="reopen-note" className="text-gray-300">
                                    Reason for reopening (optional)
                                </Label>
                                <Textarea
                                    id="reopen-note"
                                    placeholder="Why is this task being reopened?"
                                    value={reopenNote}
                                    onChange={(e) => setReopenNote(e.target.value)}
                                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setReopenModalOpen(false)}
                                    className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmReopen}
                                    disabled={isReopening}
                                    className="flex-1 bg-white text-black hover:bg-gray-200"
                                >
                                    {isReopening ? "Reopening..." : "Reopen Task"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Task Details Modal */}
                <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
                    <DialogContent className="bg-[#1C1C1C] border-white/10 text-white max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Task Details</DialogTitle>
                        </DialogHeader>
                        {selectedTask && (
                            <div className="space-y-4 mt-4">
                                <div>
                                    <h3 className="text-lg font-medium text-white">{selectedTask.title}</h3>
                                    <p className="text-sm text-gray-400">
                                        Status: {selectedTask.status === 'done' ? 'Completed' : 'Pending'}
                                    </p>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Project:</span>
                                        <span className="text-gray-300">{projects?.find((p: any) => p._id === selectedTask.projectId)?.name ?? "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Assigned To:</span>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={selectedTask.assignedTo ?? "unassigned"}
                                                onValueChange={async (value) => {
                                                    try {
                                                        await reassignTask({
                                                            taskId: selectedTask._id,
                                                            userId: value === "unassigned" ? undefined : (value as Id<"users">),
                                                        });
                                                        toast.success("Task reassigned successfully");
                                                        // Update local state to reflect change immediately
                                                        const newAssignee = value === "unassigned"
                                                            ? null
                                                            : teamMembers?.find(m => m._id === value);

                                                        setSelectedTask({
                                                            ...selectedTask,
                                                            assignedTo: value === "unassigned" ? undefined : value,
                                                            assignedUser: newAssignee
                                                        });
                                                    } catch (error) {
                                                        toast.error("Failed to reassign task");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-7 text-xs bg-[#252525] border-white/10 text-white min-w-[120px]">
                                                    <SelectValue placeholder="Unassigned" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                                    {teamMembers?.map((member) => (
                                                        <SelectItem key={member._id} value={member._id}>
                                                            {member.name ?? member.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Created:</span>
                                        <span className="text-gray-300">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {selectedTask.status === 'done' && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Completed By:</span>
                                                <span className="text-gray-300">{selectedTask.completedByUser?.name ?? "Unknown"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Completed At:</span>
                                                <span className="text-gray-300">{new Date(selectedTask.completedAt).toLocaleDateString()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {selectedTask.completionNote && (
                                    <div className="bg-[#252525] p-3 rounded-lg border border-white/5">
                                        <p className="text-xs text-gray-500 mb-1 font-medium">COMPLETION NOTE</p>
                                        <p className="text-sm text-gray-300 italic">"{selectedTask.completionNote}"</p>
                                    </div>
                                )}

                                {/* Task History / Notes */}
                                {selectedTask.notes && selectedTask.notes.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <h4 className="text-sm font-medium text-white">History</h4>
                                        <div className="space-y-3">
                                            {selectedTask.notes.slice().reverse().map((note: any, index: number) => (
                                                <div key={index} className="bg-[#252525] p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-semibold text-gray-300">
                                                            {teamMembers?.find(m => m._id === note.userId)?.name ?? "User"}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(note.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">
                                                        {note.type === 'completion' ? 'COMPLETED' : note.type === 'reopen' ? 'REOPENED' : 'NOTE'}
                                                    </div>
                                                    <p className="text-sm text-gray-300">{note.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-4 flex gap-3">
                            <Button
                                onClick={async () => {
                                    if (!selectedTask) return;
                                    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
                                        try {
                                            await deleteTask({ taskId: selectedTask._id });
                                            toast.success("Task deleted successfully");
                                            setDetailsModalOpen(false);
                                        } catch (error) {
                                            toast.error("Failed to delete task");
                                            console.error(error);
                                        }
                                    }
                                }}
                                variant="destructive"
                                className="flex-1"
                            >
                                Delete Task
                            </Button>
                            <Button onClick={() => setDetailsModalOpen(false)} className="flex-1 bg-white text-black hover:bg-gray-200">
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider >
    );
}
