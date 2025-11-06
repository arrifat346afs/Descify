
import TitleField from "./metadata-fields/TitleField"
import { DescriptionField } from "./metadata-fields/DescriptionField"
import KeywordsField from "./metadata-fields/KeywordsField"


export const MetadataSection = () => {
  return (
    <div className="h-full flex flex-col justify-start w-full border-l p-3 gap-4 select-none">
      <TitleField />
      <DescriptionField />
      <KeywordsField />
    </div>
  )
}
