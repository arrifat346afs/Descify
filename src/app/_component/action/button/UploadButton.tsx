import { Button } from "@/components/ui/button";
import { useRef } from "react";
import React from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { Upload } from "lucide-react";

type UploadButtonProps = {
  onFilesSelected: (files: File[]) => void;
};

const UploadButtonComponent = ({ onFilesSelected }: UploadButtonProps) => {
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
        variant={"ghost"}
        className="gap-2 group"
      >
        <Upload className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" />
        Upload
      </Button>
    </div>
  );
};

export const UploadButton = React.memo(UploadButtonComponent);
  

