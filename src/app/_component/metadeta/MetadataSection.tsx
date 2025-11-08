import TitleField from "./metadata-fields/TitleField";
import { DescriptionField } from "./metadata-fields/DescriptionField";
import KeywordsField from "./metadata-fields/KeywordsField";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MetadataSection = () => {
  return (
    <ScrollArea className="h-full w-full p-2">
      <div className="flex flex-col gap-4">
        <TitleField />
        <DescriptionField />
        <KeywordsField />
      </div>
    </ScrollArea>
  );
};
