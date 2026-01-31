import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type GenerationProgress = {
    isGenerating: boolean;
    currentIndex: number;
    currentFileName: string;
    totalFiles: number;
    cancelRequested: boolean;
};

interface UiState {
    settingsDialog: {
        isOpen: boolean;
        defaultTab: string;
    };
    generationProgress: GenerationProgress;
    hasAttemptedGeneration: boolean;
}

const initialState: UiState = {
    settingsDialog: {
        isOpen: false,
        defaultTab: 'models',
    },
    generationProgress: {
        isGenerating: false,
        currentIndex: 0,
        currentFileName: '',
        totalFiles: 0,
        cancelRequested: false,
    },
    hasAttemptedGeneration: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setSettingsDialogOpen(state, action: PayloadAction<boolean>) {
            state.settingsDialog.isOpen = action.payload;
        },
        setSettingsDialogTab(state, action: PayloadAction<string>) {
            state.settingsDialog.defaultTab = action.payload;
        },
        setGenerationProgress(state, action: PayloadAction<Partial<GenerationProgress>>) {
            state.generationProgress = { ...state.generationProgress, ...action.payload };
        },
        setHasAttemptedGeneration(state, action: PayloadAction<boolean>) {
            state.hasAttemptedGeneration = action.payload;
        },
    },
});

export const {
    setSettingsDialogOpen,
    setSettingsDialogTab,
    setGenerationProgress,
    setHasAttemptedGeneration,
} = uiSlice.actions;

export default uiSlice.reducer;
