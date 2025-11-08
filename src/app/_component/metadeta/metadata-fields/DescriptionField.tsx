import { Textarea } from "@/components/ui/textarea";
import { useSettings } from '@/app/contexts/SettingsContext';


export const DescriptionField = () => {
  const { generated, selectedFile, metadataLimits } = useSettings();

  const metadata = selectedFile ? generated.getMetadata(selectedFile) : undefined;
  const description = metadata?.description || '';

  const maxLength = metadataLimits.descriptionLimit;
  const currentLength = description.length;
  const isOverLimit = currentLength > maxLength;

  const handleChange = (e: any) => {
    if (selectedFile) {
      const newValue = e.target.value;
      // Enforce limit
      if (newValue.length <= maxLength) {
        generated.setMetadata(selectedFile, { description: newValue });
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-500">Description</label>
        <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
          {currentLength} / {maxLength} characters
        </span>
      </div>
      <Textarea
        value={description}
        onChange={handleChange}
        placeholder={selectedFile ? "Generate metadata for this file..." : "Select a file to view metadata"}
        
        
      />
    </div>
  );
}
