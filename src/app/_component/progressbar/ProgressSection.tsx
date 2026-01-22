import { Progress } from "@/components/ui/progress"
import { useSettings } from "@/app/contexts/SettingsContext"


export const ProgressSection = () => {
  const { thumbnails, generated } = useSettings();

  // Calculate how many files have metadata generated
  const totalFiles = thumbnails.items.length;

  // Only count files that have actual metadata content (not just custom instructions)
  const completedFiles = generated.items.filter(item => {
    const hasContent = item.metadata.title || item.metadata.description || item.metadata.keywords;
    return hasContent;
  }).length;

  const progressValue = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  console.log('📊 Progress:', completedFiles, '/', totalFiles, '=', progressValue.toFixed(1) + '%');
  return (
    <div className="w-full  flex flex-col gap-2 ">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Progress value={progressValue} key={`progress-${completedFiles}-${totalFiles}`} className="h-2" />
        </div>
        {totalFiles > 0 && (
          <span className="text-sm whitespace-nowrap font-medium pr-3">
            {completedFiles} / {totalFiles}
          </span>
        )}
      </div>
    </div>
  )
}
