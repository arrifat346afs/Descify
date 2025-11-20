import { useSettings } from "./contexts/SettingsContext";
import { Upload } from "lucide-react";
import { FileUploader } from "react-drag-drop-files";

const fileTypes = ["JPG", "JPEG", "PNG", "GIF", "WEBP", "MP4", "MOV", "WEBM"];
export const LandingPage = () => {
    const { setFiles, setHasAttemptedGeneration } = useSettings();

    // Handle file drop from react-drag-drop-files
    const handleChange = (files: File | File[]) => {
        console.log("🎁 Files dropped/selected via react-drag-drop-files!");

        // Convert single File or File array to array
        const fileArray = Array.isArray(files) ? files : [files];

        console.log("   📦 Files received:", fileArray.length);
        fileArray.forEach((file, i) => {
            console.log(`      ${i + 1}. ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
        });

        handleFiles(fileArray);
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <FileUploader
                handleChange={handleChange}
                name="file"
                types={fileTypes}
                multiple={true}
                children={
                    <div className="w-full max-w-2xl h-[60vh] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-6 transition-all duration-200 border-muted-foreground/25 hover:border-primary/50 cursor-pointer">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Upload className="w-12 h-12 text-primary" />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight">Upload your files</h2>
                            <p className="text-muted-foreground">Drag and drop images or videos here</p>
                            <p className="text-sm text-muted-foreground">or click to select files</p>
                        </div>
                    </div>
                }
            />

            <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
                Supported formats: JPG, PNG, WEBP, MP4, MOV.
                Files will be processed locally to generate thumbnails.
            </p>
        </div>
    );
};
