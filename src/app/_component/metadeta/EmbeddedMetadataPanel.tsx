/**
 * EmbeddedMetadataPanel Component
 * Displays embedded metadata status and sync controls
 */

import { useSettings } from '@/app/contexts/SettingsContext';
import { useMetadataSync } from '@/app/lib/metadata/useMetadataSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  FileWarning,
  Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export function EmbeddedMetadataPanel() {
  const { selectedFile, embedded, generated } = useSettings();
  const { readFromFile, syncSelectedFile, autoSyncEnabled, setAutoSyncEnabled } = useMetadataSync();
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const embeddedState = selectedFile ? embedded.getEmbedded(selectedFile) : undefined;
  const syncStatus = embeddedState?.syncStatus;
  const hasFilePath = !!embeddedState?.filePath;
  const embeddedMetadata = embeddedState?.embeddedMetadata;

  // Get sync status display info
  const getStatusInfo = () => {
    switch (syncStatus) {
      case 'synced':
        return { icon: CheckCircle2, color: 'text-green-500', label: 'Synced', badgeVariant: 'default' as const };
      case 'unsynced':
        return { icon: Clock, color: 'text-yellow-500', label: 'Pending', badgeVariant: 'secondary' as const };
      case 'reading':
        return { icon: Loader2, color: 'text-blue-500', label: 'Reading...', badgeVariant: 'outline' as const };
      case 'writing':
        return { icon: Loader2, color: 'text-blue-500', label: 'Writing...', badgeVariant: 'outline' as const };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-500', label: 'Error', badgeVariant: 'destructive' as const };
      case 'no-file-path':
        return { icon: FileWarning, color: 'text-orange-500', label: 'No Path', badgeVariant: 'secondary' as const };
      default:
        return { icon: Clock, color: 'text-gray-400', label: 'Unknown', badgeVariant: 'outline' as const };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Handle reading metadata from file
  const handleReadFromFile = async () => {
    if (!selectedFile || !embeddedState?.filePath) return;
    
    setIsReading(true);
    try {
      await readFromFile(selectedFile, embeddedState.filePath);
    } catch (error) {
      console.error('Failed to read metadata:', error);
    } finally {
      setIsReading(false);
    }
  };

  // Handle writing metadata to file
  const handleWriteToFile = async () => {
    if (!selectedFile) return;
    
    setIsWriting(true);
    try {
      await syncSelectedFile();
    } catch (error) {
      console.error('Failed to write metadata:', error);
    } finally {
      setIsWriting(false);
    }
  };

  if (!selectedFile) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md p-2 mt-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Embedded Metadata</span>
          <Badge variant={statusInfo.badgeVariant} className="flex items-center gap-1">
            <StatusIcon className={`h-3 w-3 ${statusInfo.color} ${syncStatus === 'reading' || syncStatus === 'writing' ? 'animate-spin' : ''}`} />
            {statusInfo.label}
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3 space-y-3">
        {/* File Path Info */}
        {hasFilePath && (
          <div className="text-xs text-muted-foreground truncate">
            Path: {embeddedState?.filePath}
          </div>
        )}

        {/* Error Message */}
        {syncStatus === 'error' && embeddedState?.lastSyncError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
            {embeddedState.lastSyncError}
          </div>
        )}

        {/* Embedded Metadata Source */}
        {embeddedMetadata && (
          <div className="text-xs text-muted-foreground">
            Source: <Badge variant="outline" className="ml-1">{embeddedMetadata.source.toUpperCase()}</Badge>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReadFromFile}
            disabled={!hasFilePath || isReading}
            className="flex-1"
          >
            {isReading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWriteToFile}
            disabled={!hasFilePath || isWriting || !generated.getMetadata(selectedFile)}
            className="flex-1"
          >
            {isWriting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Write
          </Button>
        </div>

        {/* Auto-sync Toggle */}
        <div className="flex items-center justify-between pt-2">
          <Label htmlFor="auto-sync" className="text-xs">Auto-sync on change</Label>
          <Switch
            id="auto-sync"
            checked={autoSyncEnabled}
            onCheckedChange={setAutoSyncEnabled}
            disabled={!hasFilePath}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

