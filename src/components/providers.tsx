"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { NotificationsHandler } from "./NotificationsHandler";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function ConvexClerkProvider({ children }: { children: ReactNode }) {
    // Show setup instructions if Convex isn't configured
    if (!convexUrl) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 space-y-4">
                    <h1 className="text-xl font-semibold">Setup Required</h1>
                    <p className="text-gray-600 text-sm">
                        To run this app, you need to configure Convex and Clerk:
                    </p>
                    <div className="space-y-3 text-sm">
                        <div className="bg-gray-100 rounded p-3">
                            <p className="font-medium mb-1">1. Run Convex</p>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                                npx convex dev
                            </code>
                        </div>
                        <div className="bg-gray-100 rounded p-3">
                            <p className="font-medium mb-1">2. Configure Clerk</p>
                            <p className="text-gray-600">
                                Add your Clerk keys to <code>.env.local</code>
                            </p>
                        </div>
                        <div className="bg-gray-100 rounded p-3">
                            <p className="font-medium mb-1">3. Restart the server</p>
                            <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                                npm run dev
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const convex = new ConvexReactClient(convexUrl);

    return (
        <ClerkProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <NotificationsHandler />
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
