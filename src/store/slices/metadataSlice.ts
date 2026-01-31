import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CategorySelection = {
    adobeStock: string;
    shutterStock1: string;
    shutterStock2: string;
};

export type GeneratedMetadata = {
    title: string;
    description: string;
    keywords: string;
};

export type FileMetadata = {
    file: File;
    metadata: GeneratedMetadata;
    categories?: CategorySelection;
    customInstruction?: string;
};

interface MetadataState {
    generatedMetadata: FileMetadata[];
    defaultCategories: CategorySelection;
}

const initialState: MetadataState = {
    generatedMetadata: [],
    defaultCategories: {
        adobeStock: '',
        shutterStock1: '',
        shutterStock2: '',
    }
};

const metadataSlice = createSlice({
    name: 'metadata',
    initialState,
    reducers: {
        setGeneratedMetadata(state, action: PayloadAction<FileMetadata[]>) {
            state.generatedMetadata = action.payload;
        },
        updateFileMetadata(state, action: PayloadAction<{ file: File; metadata: Partial<GeneratedMetadata> }>) {
            const index = state.generatedMetadata.findIndex((m) => m.file === action.payload.file);
            if (index !== -1) {
                state.generatedMetadata[index].metadata = {
                    ...state.generatedMetadata[index].metadata,
                    ...action.payload.metadata
                };
            } else {
                // File not found, add it
                state.generatedMetadata.push({
                    file: action.payload.file,
                    metadata: {
                        title: action.payload.metadata.title || '',
                        description: action.payload.metadata.description || '',
                        keywords: action.payload.metadata.keywords || '',
                    },
                    categories: { ...state.defaultCategories }
                });
            }
        },
        updateFileCategories(state, action: PayloadAction<{ file: File; categories: Partial<CategorySelection> }>) {
            const index = state.generatedMetadata.findIndex((m) => m.file === action.payload.file);
            if (index !== -1) {
                state.generatedMetadata[index].categories = {
                    ...(state.generatedMetadata[index].categories || state.defaultCategories),
                    ...action.payload.categories
                };
            } else {
                state.generatedMetadata.push({
                    file: action.payload.file,
                    metadata: { title: '', description: '', keywords: '' },
                    categories: { ...state.defaultCategories, ...action.payload.categories }
                });
            }
        },
        updateCustomInstruction(state, action: PayloadAction<{ file: File; instruction: string }>) {
            const index = state.generatedMetadata.findIndex((m) => m.file === action.payload.file);
            if (index !== -1) {
                state.generatedMetadata[index].customInstruction = action.payload.instruction;
            } else {
                state.generatedMetadata.push({
                    file: action.payload.file,
                    metadata: { title: '', description: '', keywords: '' },
                    customInstruction: action.payload.instruction
                });
            }
        },
        setDefaultCategories(state, action: PayloadAction<Partial<CategorySelection>>) {
            state.defaultCategories = { ...state.defaultCategories, ...action.payload };
        },
        clearGeneratedMetadata(state) {
            state.generatedMetadata = [];
        }
    },
});

export const {
    setGeneratedMetadata,
    updateFileMetadata,
    updateFileCategories,
    updateCustomInstruction,
    setDefaultCategories,
    clearGeneratedMetadata
} = metadataSlice.actions;

export default metadataSlice.reducer;
