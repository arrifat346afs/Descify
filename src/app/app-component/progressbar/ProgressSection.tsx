import { Progress } from "@/components/ui/progress"
import { useSettings } from "@/app/contexts/SettingsContext"


export const ProgressSection = () => {
  const { thumbnails, generated, generationProgress } = useSettings();

  // Calculate how many files have metadata generated
  const totalFiles = thumbnails.items.length;
  const completedFiles = generated.items.length;

  // Calculate progress percentage
  const progressValue = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  console.log('📊 Progress:', completedFiles, '/', totalFiles, '=', progressValue.toFixed(1) + '%');

  const isGenerating = generationProgress.isGenerating;
  const currentFileName = generationProgress.currentFileName;
  const currentIndex = generationProgress.currentIndex;

  return (
    <div className="w-full px-4 py-2 flex flex-col gap-2 ">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={progressValue} key={`progress-${completedFiles}-${totalFiles}`} className="h-2" />
        </div>
        {totalFiles > 0 && (
          <span className="text-sm text-gray-500 whitespace-nowrap font-medium">
            {completedFiles} / {totalFiles}
          </span>
        )}
      </div>
      {isGenerating && currentFileName && (
        <div className="text-xs text-gray-400 text-center truncate">
          🤖 Processing {currentIndex}/{totalFiles}: {currentFileName}
        </div>
      )}
    </div>
  )
}
