import { useState, useRef } from "react";
import { useSettings } from "./contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const LandingPage = () => {
    const { setFiles, setHasAttemptedGeneration } = useSettings();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if we're moving to a child element
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }

        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            handleFiles(droppedFiles);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            handleFiles(selectedFiles);
        }
    };

    const handleFiles = (files: File[]) => {
        const mediaFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        );

        if (mediaFiles.length > 0) {
            setFiles(mediaFiles);
            setHasAttemptedGeneration(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div
                className={`
          w-full max-w-2xl h-[60vh] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-6 transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="w-12 h-12 text-primary" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Upload your files</h2>
                    <p className="text-muted-foreground">Drag and drop images or videos here</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">OR</span>
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        size="lg"
                        className="min-w-[200px]"
                    >
                        Select Files
                    </Button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                />
            </div>

            <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
                Supported formats: JPG, PNG, WEBP, MP4, MOV.
                Files will be processed locally to generate thumbnails.
            </p>
        </div>
    );
};
