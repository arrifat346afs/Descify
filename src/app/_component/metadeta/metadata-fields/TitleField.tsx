import { Textarea } from "@/components/ui/textarea";
import { useSettings } from '@/app/contexts/SettingsContext';


const TitleField = () => {
  const { generated, selectedFile, metadataLimits } = useSettings();

  const metadata = selectedFile ? generated.getMetadata(selectedFile) : undefined;
  const title = metadata?.title || '';

  const maxLength = metadataLimits.titleLimit;
  const currentLength = title.length;
  const isOverLimit = currentLength > maxLength;

  const handleChange = (e: any) => {
    if (selectedFile) {
      const newValue = e.target.value;
      generated.setMetadata(selectedFile, { title: newValue });
      
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-500">Title</label>
        <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
          {currentLength} / {maxLength} characters
        </span>
      </div>
      <Textarea
        value={title}
        onChange={handleChange}
        placeholder={selectedFile ? "Generate metadata for this file..." : "Select a file to view metadata"}
        
        
      />
    </div>
  );
}

export default TitleField;