import { Loader2 } from "lucide-react";

export const LoadingPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
            </div>
            <h2 className="text-xl font-medium animate-pulse">Generating Thumbnails...</h2>
            <p className="text-muted-foreground text-sm">Please wait while we process your files</p>
        </div>
    );
};
