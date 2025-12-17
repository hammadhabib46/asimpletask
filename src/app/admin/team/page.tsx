"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
    const { user } = useUser();
    const [email, setEmail] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [userToRemove, setUserToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const currentUser = useQuery(api.users.getCurrentUser, {
        clerkId: user?.id ?? undefined,
    });

    const team = useQuery(api.teams.getTeam, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const teamMembers = useQuery(api.teams.getTeamMembers, {
        teamId: currentUser?.teamId ?? undefined,
    });

    const addMember = useMutation(api.teams.addMemberByEmail);
    const removeMember = useMutation(api.teams.removeMember);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !currentUser?.teamId) return;

        setIsAdding(true);
        try {
            await addMember({
                email: email.trim().toLowerCase(),
                teamId: currentUser.teamId,
            });
            setEmail("");
            toast.success("Member added successfully");
        } catch (error) {
            console.error("Error adding member:", error);
            toast.error("Failed to add member");
        }
        setIsAdding(false);
    };

    const handleRemoveMember = async () => {
        if (!userToRemove) return;

        setIsRemoving(true);
        try {
            await removeMember({ userId: userToRemove as Id<"users"> });
            toast.success("Team member removed successfully");
            setUserToRemove(null);
        } catch (error: any) {
            console.error("Error removing member:", error);
            toast.error(error.message || "Failed to remove member");
        }
        setIsRemoving(false);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your team members
                </p>
            </div>

            {/* Add Member Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Add Team Member</CardTitle>
                    <CardDescription>
                        Enter an email address to add someone to your team. They'll be able
                        to sign up and see their assigned tasks.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddMember} className="flex gap-3">
                        <Input
                            type="email"
                            placeholder="colleague@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="max-w-sm"
                        />
                        <Button type="submit" disabled={!email.trim() || isAdding}>
                            {isAdding ? "Adding..." : "Add Member"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Team Members Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                        {teamMembers?.length ?? 0} members in {team?.name ?? "your team"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {teamMembers && teamMembers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamMembers.map((member) => (
                                    <TableRow key={member._id}>
                                        <TableCell className="font-medium">
                                            {member.email}
                                        </TableCell>
                                        <TableCell>{member.name ?? "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                                                {member.role ?? "employee"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${member.clerkId.startsWith("pending_")
                                                    ? "bg-yellow-100 text-yellow-700"
                                                    : "bg-green-100 text-green-700"
                                                    }`}
                                            >
                                                {member.clerkId.startsWith("pending_")
                                                    ? "Invited"
                                                    : "Active"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {member._id !== currentUser?._id && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setUserToRemove(member._id)}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No team members yet. Add someone using the form above.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove team member?</DialogTitle>
                        <DialogDescription>
                            This will remove them from the team. They will no longer have access to team projects and tasks.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserToRemove(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRemoveMember}
                            disabled={isRemoving}
                        >
                            {isRemoving ? "Removing..." : "Remove"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
