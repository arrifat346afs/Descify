import { Progress } from "@/components/ui/progress"
import { useSettings } from "@/app/contexts/SettingsContext"


export const ProgressSection = () => {
  const { thumbnails, generated } = useSettings();

  // Calculate how many files have metadata generated
  const totalFiles = thumbnails.items.length;
  const completedFiles = generated.items.length;
  const progressValue = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  console.log('📊 Progress:', completedFiles, '/', totalFiles, '=', progressValue.toFixed(1) + '%');
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
    </div>
  )
}
