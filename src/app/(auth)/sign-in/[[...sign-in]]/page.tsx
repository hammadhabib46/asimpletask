import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <SignIn
                appearance={{
                    elements: {
                        formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                        card: "shadow-none border border-border",
                    }
                }}
            />
        </div>
    );
}
