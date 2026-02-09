import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserTemplate = {
    id: string;
    name: string;
    template: string;
    createdAt: string; // ISO String for serializability
};

export type EditedDefaultTemplate = {
    id: string;
    template: string;
    editedAt: string; // ISO String for serializability
};

interface TemplateState {
    activeTemplateId: string | null;
    userTemplates: UserTemplate[];
    editedDefaultTemplates: EditedDefaultTemplate[];
}

const initialState: TemplateState = {
    activeTemplateId: null,
    userTemplates: [],
    editedDefaultTemplates: [],
};

const templateSlice = createSlice({
    name: 'template',
    initialState,
    reducers: {
        setActiveTemplate(state, action: PayloadAction<string | null>) {
            state.activeTemplateId = action.payload;
        },
        addUserTemplate(state, action: PayloadAction<Omit<UserTemplate, 'id' | 'createdAt'>>) {
            const newTemplate: UserTemplate = {
                ...action.payload,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
            };
            state.userTemplates.push(newTemplate);
        },
        updateUserTemplate(state, action: PayloadAction<{ id: string; template: Partial<UserTemplate> }>) {
            const index = state.userTemplates.findIndex((t) => t.id === action.payload.id);
            if (index !== -1) {
                state.userTemplates[index] = { ...state.userTemplates[index], ...action.payload.template };
            }
        },
        deleteUserTemplate(state, action: PayloadAction<string>) {
            state.userTemplates = state.userTemplates.filter((t) => t.id !== action.payload);
            if (state.activeTemplateId === action.payload) {
                state.activeTemplateId = null;
            }
        },
        editDefaultTemplate(state, action: PayloadAction<{ id: string; template: string }>) {
            const { id, template } = action.payload;
            const existingIndex = state.editedDefaultTemplates.findIndex((t) => t.id === id);
            const editedTemplate: EditedDefaultTemplate = {
                id,
                template,
                editedAt: new Date().toISOString(),
            };
            if (existingIndex !== -1) {
                state.editedDefaultTemplates[existingIndex] = editedTemplate;
            } else {
                state.editedDefaultTemplates.push(editedTemplate);
            }
        },
        resetDefaultTemplate(state, action: PayloadAction<string>) {
            state.editedDefaultTemplates = state.editedDefaultTemplates.filter((t) => t.id !== action.payload);
        },
        resetAllDefaultTemplates(state) {
            state.editedDefaultTemplates = [];
        },
    },
});

export const {
    setActiveTemplate,
    addUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
    editDefaultTemplate,
    resetDefaultTemplate,
    resetAllDefaultTemplates,
} = templateSlice.actions;

export default templateSlice.reducer;
