import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useSettings } from '@/app/contexts/SettingsContext';
import { ScrollArea } from "@/components/ui/scroll-area";


const KeywordsField = () => {
  const { generated, selectedFile, metadataLimits } = useSettings();
  const [inputValue, setInputValue] = useState('');

  const metadata = selectedFile ? generated.getMetadata(selectedFile) : undefined;
  const keywords = metadata?.keywords || '';
  const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];

  const maxKeywords = metadataLimits.keywordLimit;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && selectedFile) {
      e.preventDefault();

      // Check if we've reached the limit
      if (keywordArray.length >= maxKeywords) {
        alert(`Maximum ${maxKeywords} keywords allowed`);
        return;
      }

      const newKeyword = inputValue.trim();

      // Don't add duplicates
      if (keywordArray.includes(newKeyword)) {
        setInputValue('');
        return;
      }

      const updatedKeywords = [...keywordArray, newKeyword].join(', ');
      generated.setMetadata(selectedFile, { keywords: updatedKeywords });
      setInputValue('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    if (!selectedFile) return;

    const updatedKeywords = keywordArray
      .filter(k => k !== keywordToRemove)
      .join(', ');
    generated.setMetadata(selectedFile, { keywords: updatedKeywords });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm text-gray-500">Keywords</label>
        <span className="text-xs text-gray-400">
          {keywordArray.length} / {maxKeywords} keywords
        </span>
      </div>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={selectedFile ? "Add keywords here (press Enter)" : "Select a file to view metadata"}
        disabled={!selectedFile}
        className="mb-3"
      />

      {/* Keywords as badges */}
      <ScrollArea className="h-[15vh] border rounded-md p-0">
      <div className="flex flex-wrap gap-2 min-h-20 p-2">
        {keywordArray.length === 0 ? (
          <span className="text-sm text-gray-400 italic">No keywords yet</span>
        ) : (
          keywordArray.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className=" text-s flex items-center gap-2 cursor-pointer hover:bg-secondary/80 rounded-sm"
            >
              {keyword}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeKeyword(keyword)}
              />
            </Badge>
          ))
        )}
      </div></ScrollArea>
    </div>
  );
}

export default KeywordsField