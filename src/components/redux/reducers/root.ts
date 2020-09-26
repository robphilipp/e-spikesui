import {combineReducers} from "redux";
// import {networkManagementReducer} from "./networkManagement";
// import {applicationReducer} from "./application";
import {settingsReducer} from './settings';
// import {networkEventReducer} from "./networkEvent";
// import {networkVisualizationReducer} from "./networkVisualization";

// combines all the application's reducers into one
export const rootReducer = combineReducers({
    // application: applicationReducer,
    settings: settingsReducer,
    // networkManagement: networkManagementReducer,
    // networkEvent: networkEventReducer,
    // networkVisualizationEvent: networkVisualizationReducer
});

export type AppState = ReturnType<typeof rootReducer>