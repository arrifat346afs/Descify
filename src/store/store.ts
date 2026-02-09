import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

import configReducer from './slices/configSlice';
import templateReducer from './slices/templateSlice';
import uiReducer from './slices/uiSlice';
import fileReducer from './slices/fileSlice';
import metadataReducer from './slices/metadataSlice';
import batchReducer from './slices/batchSlice';
import batchProcessReducer from './slices/batchProcessSlice';

const rootReducer = combineReducers({
    config: configReducer,
    template: templateReducer,
    ui: uiReducer,
    file: fileReducer,
    metadata: metadataReducer,
    batch: batchReducer,
    batchProcess: batchProcessReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['config', 'template'], // Only persist config and templates
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for redux-persist
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, 'file/setFiles', 'file/addFiles', 'file/removeFile', 'file/setFilePath', 'file/setFilePaths', 'file/setThumbnails', 'file/addThumbnail', 'file/setSelectedFile', 'metadata/updateFileMetadata', 'metadata/updateFileCategories', 'metadata/updateCustomInstruction', 'metadata/setGeneratedMetadata', 'batch/setFolders', 'batch/addFolder', 'batch/updateFolder', 'batch/removeFolder', 'batch/clearFolders', 'batchProcess/startBatchProcess', 'batchProcess/updateFolderStatus', 'batchProcess/updateImageStatus', 'batchProcess/updateFilePath'],
                // Ignore these paths in the state for File objects
                ignoredPaths: ['file.files', 'file.filePaths', 'file.thumbnails', 'file.selectedFile', 'metadata.generatedMetadata', 'batch.folders', 'batchProcess.folders'],
            },
        }),
    devTools: {
        maxAge: 5, // Limit history to 5 states to prevent RAM explosion with large payloads
        serialize: false, // Don't try to serialize large objects
    },
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
