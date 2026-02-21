import { Separator } from "@/components/ui/separator";
import ExportButton from "./button/ExportButton"
import { GenerateButton } from "./button/ GenerateButton"
import { UploadButton } from "./button/UploadButton"
// import { TemplateManagerButton } from "./button/TemplateManagerButton"
import { CancelButton } from "./button/CancelButton"


type ActionsSectionProps = {
    onFilesSelected: (files: File[]) => void;
}


export const  ActionsSection = ({ onFilesSelected }: ActionsSectionProps) => {
    const handleFilesSelected = (files: any) => {
    console.log("Selected files:", files);
    onFilesSelected(files);
  };
  return (
    <div className="flex justify-center items-center h-full select-none p-2">
      <UploadButton onFilesSelected={handleFilesSelected} />
      <Separator orientation="vertical" />
      <GenerateButton />
      <Separator orientation="vertical" />
      <CancelButton />
      {/* <Separator orientation="vertical" /> */}
      {/* <TemplateManagerButton /> */}
      <Separator orientation="vertical" />
      <ExportButton />
    </div>
  )
}
