import { ActionsSection } from "./app-component/action/ ActionsSection"
import { CategorySection } from "./app-component/category/CategorySection"
import FileSection from "./app-component/file-preview/FileSection"
import { MetadataSection } from "./app-component/metadeta/MetadataSection"
import { ProgressSection } from "./app-component/progressbar/ProgressSection"
import ThumbnailSection from "./app-component/thumbnail/ThumbnailSection"
import Navbar from "./app-component/navigation/Navbar"
import { useSettings } from "./contexts/SettingsContext"


export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles } = useSettings()

  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  return (
    <div className="h-full">
      <div>
        <Navbar />
      </div>
        <div className="flex justify-between h-[60vh] gap-0 ">
          <div className="w-[30vw] h-full"><CategorySection /></div>
          <div className="w-[40vw] h-full"><FileSection file={selectedFile} /></div>
          <div className="w-[30vw] h-full"><MetadataSection /></div>
        </div>
        <div className="flex flex-col justify-between h-[40vh]">
            <div className="h-[8vh] "><ActionsSection onFilesSelected={handleFilesSelected} /></div>
            <div className="h-[20vh"><ThumbnailSection onSelectFile={setSelectedFile} /></div>
            <div className="h-[10vh] "><ProgressSection /></div>
        </div>
    </div>
  )
}
