import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";


type UploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
}



export const UploadButton = ({ onFilesSelected }: { onFilesSelected: (files: File[]) => void } &  UploadButtonProps) => {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { setHasAttemptedGeneration } = useSettings();

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files as FileList) as File[];
    if (onFilesSelected) {
      onFilesSelected(files);
    }
    // Reset validation state when new files are uploaded
    setHasAttemptedGeneration(false);
    console.log("Selected files:", files);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hidden input field */}
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Custom upload button */}
      <Button
        
        onClick={handleClick}
        className="bg-transparent text-white hover:bg-accent"
              >
        Upload
      </Button>
    </div>
  );
}
  

