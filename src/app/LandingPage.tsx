import { useState, useRef, useEffect } from "react";
import { useSettings } from "./contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { readFile } from "@tauri-apps/plugin-fs";

export const LandingPage = () => {
    const { setFiles, setHasAttemptedGeneration } = useSettings();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file paths from Tauri drag-drop
    const handleFilePaths = async (paths: string[]) => {
        console.log("🔧 handleFilePaths called with:", paths.length, "paths");

        try {
            // Convert file paths to File objects using Tauri fs plugin
            const filePromises = paths.map(async (path) => {
                console.log(`   Reading file: ${path}`);

                // Read file as Uint8Array
                const contents = await readFile(path);

                // Get file name from path
                const fileName = path.split('/').pop() || path.split('\\').pop() || 'unknown';

                // Determine MIME type from extension
                const ext = fileName.split('.').pop()?.toLowerCase();
                let mimeType = 'application/octet-stream';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'png') mimeType = 'image/png';
                else if (ext === 'gif') mimeType = 'image/gif';
                else if (ext === 'webp') mimeType = 'image/webp';
                else if (ext === 'mp4') mimeType = 'video/mp4';
                else if (ext === 'mov') mimeType = 'video/quicktime';
                else if (ext === 'webm') mimeType = 'video/webm';

                console.log(`      File: ${fileName}, Type: ${mimeType}, Size: ${(contents.length / 1024).toFixed(2)} KB`);

                // Create File object from Uint8Array
                const blob = new Blob([contents], { type: mimeType });
                return new File([blob], fileName, { type: mimeType });
            });

            const files = await Promise.all(filePromises);
            console.log("✅ Converted paths to File objects:", files.length);
            handleFiles(files);
        } catch (error) {
            console.error("❌ Error converting file paths to File objects:", error);
        }
    };

    // Setup Tauri file drop listener
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setupFileDropListener = async () => {
            try {
                // Check if we're running in Tauri
                if (typeof window !== 'undefined' && '__TAURI__' in window) {
                    console.log("🎯 Setting up Tauri file drop listener...");
                    const webview = getCurrentWebview();

                    unlisten = await webview.onDragDropEvent((event) => {
                        console.log("📦 Tauri drag-drop event:", event);

                        if (event.payload.type === 'over') {
                            console.log("   🎯 DRAG OVER - Position:", event.payload.position);
                            setIsDragging(true);
                        } else if (event.payload.type === 'drop') {
                            console.log("   🎁 DROP - Paths:", event.payload.paths);
                            setIsDragging(false);
                            handleFilePaths(event.payload.paths);
                        } else {
                            // 'leave' or 'enter' events
                            console.log("   🚪 DRAG LEAVE/ENTER");
                            setIsDragging(false);
                        }
                    });

                    console.log("✅ Tauri file drop listener setup complete");
                } else {
                    console.log("ℹ️  Not running in Tauri, using HTML5 drag-drop");
                }
            } catch (error) {
                console.error("❌ Failed to setup Tauri file drop listener:", error);
                console.log("   Falling back to HTML5 drag-drop");
            }
        };

        setupFileDropListener();

        return () => {
            if (unlisten) {
                console.log("🧹 Cleaning up Tauri file drop listener");
                unlisten();
            }
        };
    }, []);

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
          w-full max-w-2xl h-[60vh] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-6 transition-all duration-200
          ${isDragging ? 'border-primary bg-primary/10 scale-105' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
                style={{ pointerEvents: 'none' }}
            >
                <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="w-12 h-12 text-primary" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Upload your files</h2>
                    <p className="text-muted-foreground">Drag and drop images or videos anywhere on the screen</p>
                </div>

                <div className="flex flex-col items-center gap-2" style={{ pointerEvents: 'auto' }}>
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
