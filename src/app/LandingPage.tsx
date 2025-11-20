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
        console.log("🎯 DRAG ENTER - Target:", e.target);
        console.log("   DataTransfer types:", e.dataTransfer.types);

        // Check if the drag contains files
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
            console.log("   ✅ Files detected in drag");
            setIsDragging(true);
        } else {
            console.log("   ❌ No files detected in drag");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Set dropEffect to allow dropping
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🚪 DRAG LEAVE - Target:", e.target);
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎁 DROP EVENT DETECTED!");
        console.log("   Target:", e.target);
        console.log("   DataTransfer:", e.dataTransfer);

        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            console.log("   📦 Files dropped:", droppedFiles.length);
            droppedFiles.forEach((file, i) => {
                console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
            });
            handleFiles(droppedFiles);
        } else {
            console.log("   ❌ No files in dataTransfer!");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("📂 FILE SELECT triggered");
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            console.log("   Selected files:", selectedFiles.length);
            selectedFiles.forEach((file, i) => {
                console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
            });
            handleFiles(selectedFiles);
        } else {
            console.log("   ❌ No files selected");
        }
    };

    const handleFiles = (files: File[]) => {
        console.log("🔧 handleFiles called with:", files.length, "files");

        const mediaFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            console.log(`   Checking ${file.name}: type=${file.type}, isImage=${isImage}, isVideo=${isVideo}`);
            return isImage || isVideo;
        });

        console.log("✅ Filtered media files:", mediaFiles.length);

        if (mediaFiles.length > 0) {
            console.log("🚀 Calling setFiles with", mediaFiles.length, "media files");
            mediaFiles.forEach((file, i) => {
                console.log(`   ${i + 1}. ${file.name}`);
            });
            setFiles(mediaFiles);
            setHasAttemptedGeneration(false);
            console.log("✅ setFiles called successfully!");
        } else if (files.length > 0) {
            console.warn("⚠️  No valid media files found. Dropped files:", files.map(f => `${f.name} (${f.type})`));
        } else {
            console.log("❌ No files provided to handleFiles");
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-background p-4 transition-colors duration-200"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ backgroundColor: isDragging ? 'rgba(var(--primary), 0.05)' : undefined }}
        >
            <div
                className={`
          w-full max-w-2xl h-[60vh] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-6 transition-all duration-200 pointer-events-none
          ${isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
            >
                <div className="p-4 bg-primary/10 rounded-full pointer-events-none">
                    <Upload className="w-12 h-12 text-primary" />
                </div>

                <div className="text-center space-y-2 pointer-events-none">
                    <h2 className="text-2xl font-semibold tracking-tight">Upload your files</h2>
                    <p className="text-muted-foreground">Drag and drop images or videos anywhere on the screen</p>
                </div>

                <div className="flex flex-col items-center gap-2 pointer-events-auto">
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
