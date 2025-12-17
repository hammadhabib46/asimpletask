"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Trophy, CalendarDays, Clock } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export default function PerformancePage() {
    const { user } = useUser();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const teamMembers = useQuery(api.teams.getTeamMembers, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const performanceTasks = useQuery(api.tasks.getAllTasksForAdmin, {
        teamId: currentUser?.teamId ?? undefined,
        completedBy: selectedEmployeeId !== "all" ? (selectedEmployeeId as Id<"users">) : undefined,
        dateFrom: dateRange?.from?.getTime(),
        dateTo: dateRange?.to ? dateRange.to.getTime() + 86400000 : undefined, // Add 1 day to include end date fully
    });

    // Helper to check if two dates are same day
    const isSameDay = (d1: Date, d2: Date) => {
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        if (!performanceTasks) return { total: 0, today: 0, week: 0 };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekStart = new Date(now.setDate(now.getDate() - 7)).getTime();

        const completedTasks = performanceTasks.filter(t => t.status === 'done' && t.completedAt);

        return {
            total: completedTasks.length,
            today: completedTasks.filter(t => t.completedAt! >= todayStart).length,
            week: completedTasks.filter(t => t.completedAt! >= weekStart).length,
            calendarData: completedTasks
        };
    }, [performanceTasks]);

    // Get tasks for the selected date on calendar
    const tasksForDate = useMemo(() => {
        if (!selectedDate || !performanceTasks) return [];
        return performanceTasks.filter(t => {
            if (t.status !== 'done' || !t.completedAt) return false;
            return isSameDay(new Date(t.completedAt), selectedDate);
        });
    }, [performanceTasks, selectedDate]);

    // Calendar modifiers to show which days have activity
    const activityDates = useMemo(() => {
        if (!performanceTasks) return [];
        return performanceTasks
            .filter(t => t.status === 'done' && t.completedAt)
            .map(t => new Date(t.completedAt!));
    }, [performanceTasks]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">Performance</h1>
                    <p className="text-gray-400 mt-2">View employee activity and task completion history</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Date Range Picker */}
                    <div className={cn("grid gap-2")}>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal bg-[#1C1C1C] border-white/10 text-white hover:bg-white/5 hover:text-white",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1C1C1C] border-white/10" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Employee Selector */}
                    <div className="w-[200px]">
                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                            <SelectTrigger className="bg-[#1C1C1C] border-white/10 text-white">
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1C1C1C] border-white/10 text-white">
                                <SelectItem value="all">All Employees</SelectItem>
                                {teamMembers?.map((member) => (
                                    <SelectItem key={member._id} value={member._id}>
                                        {member.name ?? member.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#1C1C1C] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total in Period</CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{metrics.total}</div>
                        <p className="text-xs text-gray-500 mt-1">Tasks completed in selection</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#1C1C1C] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Completed Today</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{metrics.today}</div>
                        <p className="text-xs text-gray-500 mt-1">Tasks finished today</p>
                    </CardContent>
                </Card>
                <Card className="bg-[#1C1C1C] border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Last 7 Days</CardTitle>
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{metrics.week}</div>
                        <p className="text-xs text-gray-500 mt-1">Recent activity</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar View */}
                <div className="lg:col-span-1">
                    <Card className="bg-[#1C1C1C] border-white/5 h-full">
                        <CardHeader>
                            <CardTitle className="text-white">Activity Calendar</CardTitle>
                            <CardDescription>Select a date to view completed tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center p-4">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="rounded-md border border-white/10"
                                modifiers={{
                                    activity: activityDates
                                }}
                                modifiersStyles={{
                                    activity: { fontWeight: 'bold', color: '#10b981', textDecoration: 'underline' }
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Daily Task List */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#1C1C1C] border-white/5 h-full">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-400" />
                                Tasks for {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] pr-4">
                                {tasksForDate.length > 0 ? (
                                    <div className="space-y-4">
                                        {tasksForDate.map((task) => (
                                            <div key={task._id} className="bg-[#252525] p-4 rounded-xl border border-white/5 hover:bg-[#2A2A2A] transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold text-white">{task.title}</h3>
                                                    <Badge variant="outline" className="border-green-500/20 text-green-400 bg-green-500/10">
                                                        {new Date(task.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                                    <span>{task.project?.name}</span>
                                                    <span>•</span>
                                                    <span>Completed by {(task as any).completedByUser?.name ?? (task as any).completedByUser?.email ?? "Unknown"}</span>
                                                </div>
                                                {task.completionNote && (
                                                    <div className="bg-[#1C1C1C] p-3 rounded-lg text-sm text-gray-300 italic border border-white/5">
                                                        "{task.completionNote}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                                        <div className="w-16 h-16 bg-[#252525] rounded-full flex items-center justify-center mb-4">
                                            <CalendarDays className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p>No tasks completed on this date</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
