"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type DatePreset = "all" | "today" | "week" | "month" | "custom";

export default function EmployeeTasksPage() {
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
    const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

    // Task creation modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskProject, setNewTaskProject] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);

    // Task completion modal state
    const [completionModalOpen, setCompletionModalOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<Id<"tasks"> | null>(null);
    const [completionNote, setCompletionNote] = useState("");
    const [isCompleting, setIsCompleting] = useState(false);

    // Task details modal state
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Reopen task modal state
    const [reopenModalOpen, setReopenModalOpen] = useState(false);
    const [taskToReopen, setTaskToReopen] = useState<Id<"tasks"> | null>(null);
    const [reopenNote, setReopenNote] = useState("");
    const [isReopening, setIsReopening] = useState(false);


    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    // Get all projects for the team for task creation
    const allProjects = useQuery(api.projects.getProjects, {
        teamId: currentUser?.teamId ?? undefined,
    });

    // Get team members for history display
    const teamMembers = useQuery(api.teams.getTeamMembers, {
        teamId: currentUser?.teamId ?? undefined,
    });

    // Calculate date range based on preset
    const dateRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (datePreset) {
            case "today":
                return {
                    from: today.getTime(),
                    to: now.getTime() + 86400000,
                };
            case "week":
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return {
                    from: weekAgo.getTime(),
                    to: now.getTime() + 86400000,
                };
            case "month":
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return {
                    from: monthAgo.getTime(),
                    to: now.getTime() + 86400000,
                };
            case "custom":
                return {
                    from: customDateFrom?.getTime(),
                    to: customDateTo ? customDateTo.getTime() + 86400000 : undefined,
                };
            default:
                return { from: undefined, to: undefined };
        }
    }, [datePreset, customDateFrom, customDateTo]);

    const tasks = useQuery(api.tasks.getMyTasks, {
        userId: currentUser?._id,
        searchQuery: searchQuery || undefined,
        projectFilter:
            projectFilter === "all"
                ? undefined
                : (projectFilter as Id<"projects">),
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
    });

    // Get unique projects from tasks for the filter dropdown
    const uniqueProjects = useMemo(() => {
        if (!tasks) return [];
        const projects = new Map<string, { id: string; name: string }>();
        tasks.forEach((task) => {
            if (task.project) {
                projects.set(task.project._id, {
                    id: task.project._id,
                    name: task.project.name,
                });
            }
        });
        return Array.from(projects.values());
    }, [tasks]);

    const createTask = useMutation(api.tasks.createTask);
    const markDone = useMutation(api.tasks.markTaskDone);
    const markPending = useMutation(api.tasks.markTaskPending);

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim() || !newTaskProject || !currentUser) return;

        setIsCreating(true);
        try {
            await createTask({
                title: newTaskTitle.trim(),
                projectId: newTaskProject as Id<"projects">,
                assignedTo: currentUser._id, // Assign to self
                createdBy: currentUser._id,
            });
            toast.success("Task created successfully");
            setNewTaskTitle("");
            setNewTaskProject("");
            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Error creating task:", error);
            toast.error(error.message || "Failed to create task");
        }
        setIsCreating(false);
    };

    const handleToggleStatus = async (taskId: Id<"tasks">, currentStatus: string) => {
        if (currentStatus === "done") {
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

    const pendingCount = tasks?.filter((t) => t.status === "pending").length ?? 0;
    const doneCount = tasks?.filter((t) => t.status === "done").length ?? 0;

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <h1 className="text-4xl font-black tracking-tighter text-white">My Tasks</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tasks Section - Takes up 2 columns */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-2xl font-bold text-white">Tasks</h2>
                                    <p className="text-gray-400 text-sm">
                                        {pendingCount} pending · {doneCount} completed
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Search */}
                                        <Input
                                            placeholder="Search tasks..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-[180px] placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                                        />

                                        {/* Project Filter */}
                                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                                            <SelectTrigger className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-auto gap-2 hover:bg-[#333] transition-colors focus:ring-0 focus:ring-offset-0">
                                                <span className="font-medium">Project</span>
                                                <span className="text-gray-400 truncate max-w-[100px]">
                                                    {projectFilter === "all"
                                                        ? "All"
                                                        : uniqueProjects.find(p => p.id === projectFilter)?.name ?? "Selected"}
                                                </span>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                <SelectItem value="all">All Projects</SelectItem>
                                                {uniqueProjects.map((project) => (
                                                    <SelectItem key={project.id} value={project.id}>
                                                        {project.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Date Filter */}
                                        <Select
                                            value={datePreset}
                                            onValueChange={(value) => setDatePreset(value as DatePreset)}
                                        >
                                            <SelectTrigger className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 w-auto hover:bg-[#333] transition-colors focus:ring-0 focus:ring-offset-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1C1C1C] border-white/10">
                                                <SelectItem value="all">Any Time</SelectItem>
                                                <SelectItem value="today">Today</SelectItem>
                                                <SelectItem value="week">Past Week</SelectItem>
                                                <SelectItem value="month">Past Month</SelectItem>
                                                <SelectItem value="custom">Custom Range</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Custom Date Range */}
                                        {datePreset === "custom" && (
                                            <div className="flex items-center gap-2">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 hover:bg-[#333] hover:text-white">
                                                            {customDateFrom
                                                                ? customDateFrom.toLocaleDateString()
                                                                : "From"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 bg-[#1C1C1C] border-white/10" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={customDateFrom}
                                                            onSelect={setCustomDateFrom}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <span className="text-gray-500">—</span>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs bg-[#2A2A2A] text-white border border-white/10 rounded-full px-3 hover:bg-[#333] hover:text-white">
                                                            {customDateTo
                                                                ? customDateTo.toLocaleDateString()
                                                                : "To"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 bg-[#1C1C1C] border-white/10" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={customDateTo}
                                                            onSelect={setCustomDateTo}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Task Creation Modal */}
                                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white h-8 text-xs">
                                            <Plus className="w-3 h-3 mr-1" /> Task
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-[#1C1C1C] border-white/10 text-white max-w-md">
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
                                                        {allProjects?.map((project) => (
                                                            <SelectItem key={project._id} value={project._id}>
                                                                {project.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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

                            {/* Custom Table Implementation to match admin dashboard */}
                            <div className="w-full">
                                <div className="grid grid-cols-12 gap-4 text-gray-400 text-sm font-medium mb-4 px-4">
                                    <div className="col-span-1">Done</div>
                                    <div className="col-span-5">Task</div>
                                    <div className="col-span-3">Project</div>
                                    <div className="col-span-3 text-right">Created</div>
                                </div>

                                <div className="space-y-2">
                                    {tasks && tasks.length > 0 ? (
                                        tasks.map((task) => (
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
                                                <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                                    <span
                                                        className={`font-medium truncate ${task.status === "done"
                                                            ? "line-through text-gray-500"
                                                            : "text-white"
                                                            }`}
                                                    >
                                                        {task.title}
                                                    </span>
                                                    {task.status === "done" && task.completionNote && (
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
                                                <div className="col-span-3 text-gray-400 text-xs truncate">
                                                    {task.project?.name ?? "—"}
                                                </div>
                                                <div className="col-span-3 text-right text-gray-400">
                                                    {new Date(task.createdAt).toLocaleDateString(undefined, {
                                                        day: 'numeric',
                                                        month: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            {searchQuery || projectFilter !== "all" || datePreset !== "all"
                                                ? "No tasks match your filters."
                                                : "No tasks assigned to you yet."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section - Takes up 1 column */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5 h-full min-h-[400px]">
                            <h2 className="text-2xl font-bold text-white mb-1">Task Summary</h2>
                            <p className="text-gray-500 text-sm mb-6">Your task completion stats</p>

                            <div className="space-y-6">
                                {/* Stats Cards */}
                                <div className="bg-[#252525] rounded-xl p-4">
                                    <div className="text-4xl font-black text-white mb-1">{pendingCount}</div>
                                    <div className="text-gray-400 text-sm">Pending Tasks</div>
                                </div>

                                <div className="bg-[#252525] rounded-xl p-4">
                                    <div className="text-4xl font-black text-white mb-1">{doneCount}</div>
                                    <div className="text-gray-400 text-sm">Completed Tasks</div>
                                </div>

                                <div className="bg-[#252525] rounded-xl p-4">
                                    <div className="text-4xl font-black text-white mb-1">
                                        {tasks && tasks.length > 0
                                            ? Math.round((doneCount / tasks.length) * 100)
                                            : 0}%
                                    </div>
                                    <div className="text-gray-400 text-sm">Completion Rate</div>
                                </div>
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
                                        <span className="text-gray-300">{selectedTask.project?.name ?? "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Created:</span>
                                        <span className="text-gray-300">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {selectedTask.status === 'done' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Completed At:</span>
                                            <span className="text-gray-300">{new Date(selectedTask.completedAt).toLocaleDateString()}</span>
                                        </div>
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
                                                            {teamMembers?.find((m: any) => m._id === note.userId)?.name ?? "User"}
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
                        <div className="mt-4">
                            <Button onClick={() => setDetailsModalOpen(false)} className="w-full bg-white text-black hover:bg-gray-200">
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
