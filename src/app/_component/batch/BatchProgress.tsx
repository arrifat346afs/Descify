import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, CheckCircle, AlertCircle, FileImage } from "lucide-react";

export type ProcessingState = 'idle' | 'scanning' | 'generating_thumbnails' | 'processing' | 'completed' | 'error';

export interface BatchProgress {
  state: ProcessingState;
  progress: number; // 0-100
  currentFile?: string;
  totalFiles: number;
  processedFiles: number;
  error?: string;
}

type BatchProgressProps = {
  progress: BatchProgress;
  onCancel?: () => void;
  onRetry?: () => void;
};

export const BatchProgress = ({ progress, onCancel, onRetry }: BatchProgressProps) => {
  const { state, progress: progressValue, currentFile, totalFiles, processedFiles, error } = progress;

  const getStateInfo = () => {
    switch (state) {
      case 'scanning':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Scanning folder...',
          color: 'default' as const,
          bgColor: 'bg-blue-50 dark:bg-blue-950'
        };
      case 'generating_thumbnails':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Generating thumbnails...',
          color: 'default' as const,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950'
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Processing files...',
          color: 'default' as const,
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          label: 'Completed',
          color: 'secondary' as const,
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          label: 'Error',
          color: 'destructive' as const,
          bgColor: 'bg-red-50 dark:bg-red-950'
        };
      default:
        return {
          icon: <FileImage className="w-4 h-4" />,
          label: 'Ready',
          color: 'secondary' as const,
          bgColor: 'bg-gray-50 dark:bg-gray-950'
        };
    }
  };

  const stateInfo = getStateInfo();
  const isActive = state !== 'idle' && state !== 'completed';

  if (state === 'idle') {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stateInfo.icon}
            <CardTitle className="text-base">Batch Processing</CardTitle>
            <Badge variant={stateInfo.color} className="text-xs">
              {stateInfo.label}
            </Badge>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {state === 'error' && onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="text-xs h-7"
              >
                Retry
              </Button>
            )}
            {(state === 'processing' || state === 'generating_thumbnails' || state === 'scanning') && onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{processedFiles} of {totalFiles} files</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress 
              value={progressValue} 
              className="h-2"
            />
          </div>
        )}

        {/* Current File */}
        {currentFile && (state === 'processing' || state === 'generating_thumbnails') && (
          <div className="text-sm text-muted-foreground">
            <span className="text-xs">Current: </span>
            <span className="truncate" title={currentFile}>
              {currentFile}
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && state === 'error' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Completion Summary */}
        {state === 'completed' && (
          <div className={`p-3 rounded-md ${stateInfo.bgColor} border border-green-200 dark:border-green-800`}>
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <CheckCircle className="w-4 h-4" />
              <span>
                Successfully processed {processedFiles} files
              </span>
            </div>
          </div>
        )}

        {/* Status Details */}
        <div className="text-xs text-muted-foreground text-center">
          {state === 'scanning' && 'Finding all media files in the folder...'}
          {state === 'generating_thumbnails' && 'Creating previews for faster browsing...'}
          {state === 'processing' && 'Generating metadata and descriptions...'}
          {state === 'completed' && 'All files have been processed successfully!'}
          {state === 'error' && 'Processing failed. Please check the error message above.'}
        </div>
      </CardContent>
    </Card>
  );
};