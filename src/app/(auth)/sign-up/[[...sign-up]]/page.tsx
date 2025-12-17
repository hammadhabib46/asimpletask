import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <SignUp
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
