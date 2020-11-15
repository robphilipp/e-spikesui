import {combineReducers} from "redux";
import {applicationReducer} from "./application";
import {settingsReducer} from './settings';
import {networkDescriptionReducer} from "./networkDescription";
import {environmentReducer} from "./environment";

// combines all the application's reducers into one
export const rootReducer = combineReducers({
    application: applicationReducer,
    settings: settingsReducer,
    networkDescription: networkDescriptionReducer,
    environment: environmentReducer,
});

export type AppState = ReturnType<typeof rootReducer>