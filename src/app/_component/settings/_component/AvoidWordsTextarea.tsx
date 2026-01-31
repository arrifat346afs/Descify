import { Textarea } from "@/components/ui/textarea";

interface AvoidWordsTextareaProps {
  label: string;
  avoidWords?: string[];
  onAvoidWordsChange?: (words: string[]) => void;
  placeholder?: string;
}

export const AvoidWordsTextarea = ({ 
  label, 
  avoidWords, 
  onAvoidWordsChange, 
  placeholder = "Enter words to avoid (comma-separated)" 
}: AvoidWordsTextareaProps) => {
  const currentWordsString = (avoidWords || []).join(', ');
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    // Split by commas and trim whitespace
    const words = input
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    
    if (onAvoidWordsChange) {
      onAvoidWordsChange(words);
    }
  };

  return (
    <div>
      <div className="flex gap-3 p-2">
        <h4>{label}</h4>
        <span className="text-xs">({(avoidWords || []).length} words)</span>
      </div>
      <Textarea
        value={currentWordsString}
        onChange={handleChange}
        placeholder={placeholder}
        rows={2}
        className="text-sm"
      />
    </div>
  );
};

export default AvoidWordsTextarea;