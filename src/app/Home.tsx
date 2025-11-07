import { ActionsSection } from "./app-component/action/ ActionsSection"
import { CategorySection } from "./app-component/category/CategorySection"
import FileSection from "./app-component/file-preview/FileSection"
import { MetadataSection } from "./app-component/metadeta/MetadataSection"
import { ProgressSection } from "./app-component/progressbar/ProgressSection"
import ThumbnailSection from "./app-component/thumbnail/ThumbnailSection"
import Navbar from "./app-component/navigation/Navbar"
import { useSettings } from "./contexts/SettingsContext"

//this is test to if the auto commite works or not
// how about now
export const Home = () => {
  const { selectedFile, setSelectedFile, setFiles } = useSettings()

  const handleFilesSelected = (files: File[]) => {
    setFiles(files);
  };

  return (
    <div className="min-h-screen flex flex-col m-0 p-0">
      <div>
        <Navbar />
      </div>
        <div className="flex justify-between h-[59vh] ">
          <div className="w-[30vw] h-full"><CategorySection /></div>
          <div className="w-[40vw] h-full"><FileSection file={selectedFile} /></div>
          <div className="w-[30vw] h-full"><MetadataSection /></div>
        </div>
        <div className="flex flex-col h-[40vh]">
            <div className="h-[6vh] shrink-0 "><ActionsSection onFilesSelected={handleFilesSelected} /></div>
            <div className="h-[27vh] w-full border"><ThumbnailSection onSelectFile={setSelectedFile} /></div>
            <div className="h-[4vh] shrink-0 "><ProgressSection /></div>
        </div>
    </div>
  )
}
