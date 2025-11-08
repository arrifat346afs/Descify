import TitleField from "./metadata-fields/TitleField";
import { DescriptionField } from "./metadata-fields/DescriptionField";
import KeywordsField from "./metadata-fields/KeywordsField";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MetadataSection = () => {
  return (
    <ScrollArea >
      <div className="flex flex-col gap-4 p-2">
        <TitleField />
        <DescriptionField />
        <KeywordsField />
      </div>
    </ScrollArea>
  );
};
