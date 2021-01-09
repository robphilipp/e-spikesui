import {combineReducers} from "redux";
import {applicationReducer} from "./application";
import {settingsReducer} from './settings';
import {networkDescriptionReducer} from "./networkDescription";
import {sensorsReducer} from "./sensors";
import {simulationProjectReducer} from "./simulationProject";
import {networkManagementReducer} from "./networkManagement";
import { networkEventReducer } from "./networkEvent";
import {networkVisualizationReducer} from "./networkVisualization";

// combines all the application's reducers into one
export const rootReducer = combineReducers({
    application: applicationReducer,
    settings: settingsReducer,
    networkDescription: networkDescriptionReducer,
    sensorDescription: sensorsReducer,
    simulationProject: simulationProjectReducer,
    networkManagement: networkManagementReducer,
    networkEvent: networkEventReducer,
    networkVisualizationEvent: networkVisualizationReducer
});

export type AppState = ReturnType<typeof rootReducer>