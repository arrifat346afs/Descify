
import { ActionsSection } from "./_component/action/ ActionsSection";
import { CategorySection } from "./_component/category/CategorySection";
import FileSection from "./_component/file-preview/FileSection";
import { MetadataSection } from "./_component/metadeta/MetadataSection";
import Navbar from "./_component/navigation/Navbar";
import { ProgressSection } from "./_component/progressbar/ProgressSection";
import ThumbnailSection from "./_component/thumbnail/ThumbnailSection";
import { useSettings } from "./contexts/SettingsContext"
import { Separator } from "@/components/ui/separator"


export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles } = useSettings()

  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  return (
    <div className="min-h-screen flex flex-col m-0 p-0">
      <div className="h-[35px]">
        <Navbar />
      </div>
      <Separator  />
        <div className="flex h-[59vh] ">
          <div className="w-[30vw] h-full "><CategorySection /></div>
          <Separator orientation="vertical" />
          <div className="w-[40vw] h-full"><FileSection file={selectedFile} /></div>
          <Separator orientation="vertical" />
          <div className="w-[30vw] h-full"><MetadataSection /></div>
        </div>
        <Separator  />
        <div className="flex flex-col h-[40vh]">
            <div className="h-[6vh] shrink-0 "><ActionsSection onFilesSelected={handleFilesSelected} /></div>
             <Separator  />
            <div className="h-[29vh] w-full"><ThumbnailSection onSelectFile={setSelectedFile} /></div>
            <div className="h-[7vh] shrink-0 "><ProgressSection /></div>
        </div>
    </div>
  )
}
