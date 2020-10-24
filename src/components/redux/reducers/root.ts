import {combineReducers} from "redux";
import {applicationReducer} from "./application";
import {settingsReducer} from './settings';
import {networkDescriptionReducer} from "./networkDescription";

// combines all the application's reducers into one
export const rootReducer = combineReducers({
    application: applicationReducer,
    settings: settingsReducer,
    networkDescription: networkDescriptionReducer
});

export type AppState = ReturnType<typeof rootReducer>