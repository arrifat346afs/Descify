import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FolderInfo } from '@/app/_component/batch/FolderInfoCard';

interface BatchState {
  folders: FolderInfo[];
}

const initialState: BatchState = {
  folders: [],
};

const batchSlice = createSlice({
  name: 'batch',
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<FolderInfo[]>) {
      state.folders = action.payload;
    },
    addFolder(state, action: PayloadAction<FolderInfo>) {
      state.folders.push(action.payload);
    },
    updateFolder(state, action: PayloadAction<{ id: string; updates: Partial<FolderInfo> }>) {
      const index = state.folders.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.folders[index] = { ...state.folders[index], ...action.payload.updates };
      }
    },
    removeFolder(state, action: PayloadAction<string>) {
      state.folders = state.folders.filter(f => f.id !== action.payload);
    },
    clearFolders(state) {
      state.folders = [];
    },
  },
});

export const {
  setFolders,
  addFolder,
  updateFolder,
  removeFolder,
  clearFolders,
} = batchSlice.actions;

export default batchSlice.reducer;
