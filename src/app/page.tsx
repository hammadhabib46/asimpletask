"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? { clerkId: user?.id } : "skip"
  );

  const createOrGetUser = useMutation(api.users.createOrGetUser);

  useEffect(() => {
    const handleSignedInUser = async () => {
      if (!isLoaded || !isSignedIn || !user) return;

      // If we're still loading user data from Convex, wait
      if (currentUser === undefined) return;

      // If user doesn't exist in Convex, create them
      if (currentUser === null && !isCreatingUser) {
        setIsCreatingUser(true);
        try {
          await createOrGetUser({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            name: user.fullName ?? undefined,
          });
        } catch (error) {
          console.error("Error creating user:", error);
        }
        setIsCreatingUser(false);
        return; // Will re-run when currentUser updates
      }

      // User exists - redirect based on role
      if (currentUser) {
        if (!currentUser.role) {
          router.push("/select-role");
        } else if (currentUser.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/employee/tasks");
        }
      }
    };

    handleSignedInUser();
  }, [isLoaded, isSignedIn, user, currentUser, createOrGetUser, router, isCreatingUser]);

  // Show loading state for signed in users
  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <div className="text-muted-foreground">Setting up your account...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-semibold text-xl">TaskFlow</div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Simple task management
            <br />
            <span className="text-muted-foreground">for modern teams</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            A clean, minimal way to organize projects and assign tasks.
            No clutter, no complexity—just pure productivity.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">Start Free</Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © 2024 TaskFlow. Keep it simple.
      </footer>
    </div>
  );
}

