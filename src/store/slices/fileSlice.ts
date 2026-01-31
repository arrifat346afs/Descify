import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThumbnailData = {
    file: File;
    thumbnailUrl: string;
};

interface FileState {
    files: File[];
    filePaths: Map<File, string>;
    thumbnails: ThumbnailData[];
    isGeneratingThumbnails: boolean;
    pendingThumbnailCount: number;
    selectedFile: File | null;
}

const initialState: FileState = {
    files: [],
    filePaths: new Map(),
    thumbnails: [],
    isGeneratingThumbnails: false,
    pendingThumbnailCount: 0,
    selectedFile: null,
};

const fileSlice = createSlice({
    name: 'file',
    initialState,
    reducers: {
        setFiles(state, action: PayloadAction<File[]>) {
            // Redux Toolkit uses Immer, so we can mute the state directly.
            // However, File objects are non-serializable. We'll handle middleware check configuration in store.ts.
            state.files = action.payload;
        },
        addFiles(state, action: PayloadAction<File[]>) {
            state.files.push(...action.payload);
        },
        removeFile(state, action: PayloadAction<File>) {
            state.files = state.files.filter((f) => f !== action.payload);
            state.thumbnails = state.thumbnails.filter((t) => t.file !== action.payload);
            state.filePaths.delete(action.payload);
            if (state.selectedFile === action.payload) {
                state.selectedFile = null;
            }
        },
        setFilePath(state, action: PayloadAction<{ file: File; path: string }>) {
            state.filePaths.set(action.payload.file, action.payload.path);
        },
        setFilePaths(state, action: PayloadAction<Map<File, string>>) {
            state.filePaths = action.payload;
        },
        setThumbnails(state, action: PayloadAction<ThumbnailData[]>) {
            state.thumbnails = action.payload;
        },
        addThumbnail(state, action: PayloadAction<ThumbnailData>) {
            // Check if exists
            const index = state.thumbnails.findIndex(t => t.file === action.payload.file);
            if (index !== -1) {
                state.thumbnails[index] = action.payload;
            } else {
                state.thumbnails.push(action.payload);
            }
        },
        setIsGeneratingThumbnails(state, action: PayloadAction<boolean>) {
            state.isGeneratingThumbnails = action.payload;
        },
        setPendingThumbnailCount(state, action: PayloadAction<number>) {
            state.pendingThumbnailCount = action.payload;
        },
        setSelectedFile(state, action: PayloadAction<File | null>) {
            state.selectedFile = action.payload;
        },
        clearThumbnails(state) {
            state.thumbnails = [];
            state.pendingThumbnailCount = 0;
            state.isGeneratingThumbnails = false;
        },
        // Bulk action for efficient batch updates - O(N) instead of O(N²)
        upsertThumbnails(state, action: PayloadAction<ThumbnailData[]>) {
            const newItems = action.payload;
            if (newItems.length === 0) return;

            // Build index map for O(1) lookups
            const fileToIndex = new Map<File, number>();
            state.thumbnails.forEach((t, i) => fileToIndex.set(t.file, i));

            newItems.forEach(item => {
                const existingIndex = fileToIndex.get(item.file);
                if (existingIndex !== undefined) {
                    state.thumbnails[existingIndex] = item;
                } else {
                    state.thumbnails.push(item);
                    fileToIndex.set(item.file, state.thumbnails.length - 1);
                }
            });
        }
    },
});

export const {
    setFiles,
    addFiles,
    removeFile,
    setFilePath,
    setFilePaths,
    setThumbnails,
    addThumbnail,
    upsertThumbnails,
    setIsGeneratingThumbnails,
    setPendingThumbnailCount,
    setSelectedFile,
    clearThumbnails
} = fileSlice.actions;

export default fileSlice.reducer;
