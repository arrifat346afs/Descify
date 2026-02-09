import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FolderInfo } from '@/app/_component/batch/FolderInfoCard';
import type { GeneratedMetadata } from '@/app/lib/ai';

export type BatchProcessStatus = 
  | 'idle' 
  | 'scanning' 
  | 'processing' 
  | 'embedding' 
  | 'exporting' 
  | 'completed' 
  | 'paused'
  | 'error';

export type ImageProcessingState = {
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  metadata?: GeneratedMetadata;
  error?: string;
};

export type FolderProcessingState = {
  folderId: string;
  folderPath: string;
  folderName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  images: ImageProcessingState[];
  currentImageIndex: number;
  assignedTemplateId: string | null;
  error?: string;
  exportedFilePath?: string;
};

export type BatchProcessState = {
  isProcessing: boolean;
  overallStatus: BatchProcessStatus;
  currentFolderIndex: number;
  totalFolders: number;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  folders: FolderProcessingState[];
  startTime?: number;
  error?: string;
  processingMode: 'sequential' | 'parallel';
  currentStage: 'ai_generation' | 'metadata_embedding' | 'exporting' | null;
};

const initialState: BatchProcessState = {
  isProcessing: false,
  overallStatus: 'idle',
  currentFolderIndex: 0,
  totalFolders: 0,
  totalImages: 0,
  completedImages: 0,
  failedImages: 0,
  folders: [],
  processingMode: 'sequential',
  currentStage: null,
};

const batchProcessSlice = createSlice({
  name: 'batchProcess',
  initialState,
  reducers: {
    startBatchProcess(state, action: PayloadAction<{ 
      folders: FolderInfo[]; 
      processingMode: 'sequential' | 'parallel' 
    }>) {
      const { folders, processingMode } = action.payload;
      
      state.isProcessing = true;
      state.overallStatus = 'scanning';
      state.processingMode = processingMode;
      state.currentFolderIndex = 0;
      state.totalFolders = folders.length;
      state.totalImages = folders.reduce((acc, f) => acc + f.imageCount, 0);
      state.completedImages = 0;
      state.failedImages = 0;
      state.startTime = Date.now();
      state.error = undefined;
      state.currentStage = null;
      
      state.folders = folders.map((folder, index) => ({
        folderId: folder.id,
        folderPath: folder.folderPath,
        folderName: folder.folderPath.split(/[/\\]/).pop() || 'Unknown',
        status: index === 0 ? 'processing' : 'pending',
        images: folder.files
          .filter(f => f.type.startsWith('image/'))
          .map(file => ({
            fileName: file.name,
            filePath: '', // Will be populated when processing
            status: 'pending',
          })),
        currentImageIndex: 0,
        assignedTemplateId: folder.assignedTemplateId,
      }));
    },
    
    updateFolderStatus(state, action: PayloadAction<{ 
      folderId: string; 
      status: FolderProcessingState['status'];
      error?: string;
    }>) {
      const folder = state.folders.find(f => f.folderId === action.payload.folderId);
      if (folder) {
        folder.status = action.payload.status;
        if (action.payload.error) {
          folder.error = action.payload.error;
        }
      }
    },
    
    updateImageStatus(state, action: PayloadAction<{
      folderId: string;
      fileName: string;
      status: ImageProcessingState['status'];
      metadata?: GeneratedMetadata;
      error?: string;
    }>) {
      const folder = state.folders.find(f => f.folderId === action.payload.folderId);
      if (folder) {
        const image = folder.images.find(img => img.fileName === action.payload.fileName);
        if (image) {
          image.status = action.payload.status;
          if (action.payload.metadata) {
            image.metadata = action.payload.metadata;
          }
          if (action.payload.error) {
            image.error = action.payload.error;
          }
        }
      }
      
      // Update counters
      if (action.payload.status === 'completed') {
        state.completedImages++;
      } else if (action.payload.status === 'error') {
        state.failedImages++;
      }
    },
    
    setCurrentStage(state, action: PayloadAction<BatchProcessState['currentStage']>) {
      state.currentStage = action.payload;
      if (action.payload === 'ai_generation') {
        state.overallStatus = 'processing';
      } else if (action.payload === 'metadata_embedding') {
        state.overallStatus = 'embedding';
      } else if (action.payload === 'exporting') {
        state.overallStatus = 'exporting';
      }
    },
    
    setCurrentFolderIndex(state, action: PayloadAction<number>) {
      state.currentFolderIndex = action.payload;
      
      // Update folder statuses
      state.folders.forEach((folder, index) => {
        if (index < action.payload) {
          folder.status = 'completed';
        } else if (index === action.payload) {
          folder.status = 'processing';
        } else {
          folder.status = 'pending';
        }
      });
    },
    
    updateImageProgress(state, action: PayloadAction<{
      folderId: string;
      currentImageIndex: number;
    }>) {
      const folder = state.folders.find(f => f.folderId === action.payload.folderId);
      if (folder) {
        folder.currentImageIndex = action.payload.currentImageIndex;
      }
    },
    
    markFolderExported(state, action: PayloadAction<{
      folderId: string;
      exportedFilePath: string;
    }>) {
      const folder = state.folders.find(f => f.folderId === action.payload.folderId);
      if (folder) {
        folder.exportedFilePath = action.payload.exportedFilePath;
      }
    },
    
    completeBatchProcess(state) {
      state.isProcessing = false;
      state.overallStatus = 'completed';
      state.currentStage = null;
    },
    
    pauseBatchProcess(state) {
      state.isProcessing = false;
      state.overallStatus = 'paused';
    },
    
    resumeBatchProcess(state) {
      state.isProcessing = true;
      state.overallStatus = 'processing';
    },
    
    failBatchProcess(state, action: PayloadAction<string>) {
      state.isProcessing = false;
      state.overallStatus = 'error';
      state.error = action.payload;
    },
    
    cancelBatchProcess(state) {
      state.isProcessing = false;
      state.overallStatus = 'idle';
      state.currentStage = null;
    },
    
    resetBatchProcess() {
      return initialState;
    },
    
    updateFilePath(state, action: PayloadAction<{
      folderId: string;
      fileName: string;
      filePath: string;
    }>) {
      const folder = state.folders.find(f => f.folderId === action.payload.folderId);
      if (folder) {
        const image = folder.images.find(img => img.fileName === action.payload.fileName);
        if (image) {
          image.filePath = action.payload.filePath;
        }
      }
    },
  },
});

export const {
  startBatchProcess,
  updateFolderStatus,
  updateImageStatus,
  setCurrentStage,
  setCurrentFolderIndex,
  updateImageProgress,
  markFolderExported,
  completeBatchProcess,
  pauseBatchProcess,
  resumeBatchProcess,
  failBatchProcess,
  cancelBatchProcess,
  resetBatchProcess,
  updateFilePath,
} = batchProcessSlice.actions;

export default batchProcessSlice.reducer;
