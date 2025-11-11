import { Progress } from "@/components/ui/progress"
import { useSettings } from "@/app/contexts/SettingsContext"


export const ProgressSection = () => {
  const { thumbnails, generated, generationProgress } = useSettings();

  // Calculate how many files have metadata generated
  const totalFiles = thumbnails.items.length;
  const completedFiles = generated.items.length;
  const progressValue = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  console.log('📊 Progress:', completedFiles, '/', totalFiles, '=', progressValue.toFixed(1) + '%');

  const isGenerating = generationProgress.isGenerating;
  const currentFileName = generationProgress.currentFileName;
  const currentIndex = generationProgress.currentIndex;

  return (
    <div className="w-full  flex flex-col gap-2 ">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Progress value={progressValue} key={`progress-${completedFiles}-${totalFiles}`} className="h-2" />
        </div>
        {totalFiles > 0 && (
          <span className="text-sm text-gray-500 whitespace-nowrap font-medium pr-3">
            {completedFiles} / {totalFiles}
          </span>
        )}
      </div>
      {isGenerating && currentFileName && (
        <div className="text-xs text-gray-400 text-center truncate pr-2 pb-4">
          🤖 Processing {currentIndex}/{totalFiles}: {currentFileName}
        </div>
      )}
    </div>
  )
}
