/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
import {ResponseAction, successAction} from "./actions";
import {ThunkAction} from "redux-thunk";
import {
    loadSensorsOrInitialize,
    readSensors,
    saveSensors as persistEnvironment
} from "../../repos/sensorRepo";

export const SENSORS_LOADED = 'sensors-loaded';
export const SENSORS_CHANGED = 'sensors-changed';
export const SENSORS_SAVED = 'sensors-saved';

/*
 |
 | Action definitions (for use by the reducers)
 |
 */
export interface SensorsResult {
    codeSnippet: string;
    path: string;
}

export type SensorsLoadedAction = ResponseAction<typeof SENSORS_LOADED, SensorsResult>;
export type SensorsSavedAction = ResponseAction<typeof SENSORS_SAVED, SensorsResult>;

export interface SensorsUpdatedAction {
    type: typeof SENSORS_CHANGED;
    codeSnippet: string;
}

export type ResponseActionType = typeof SENSORS_LOADED
    | typeof SENSORS_SAVED
    | typeof SENSORS_CHANGED;

export type SensorsAction = SensorsLoadedAction
    | SensorsUpdatedAction
    | SensorsSavedAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */
export function updateSensors(codeSnippet: string): SensorsUpdatedAction {
    return {
        type: SENSORS_CHANGED,
        codeSnippet: codeSnippet
    }
}

export function loadSensorsFrom(path: string): ThunkAction<Promise<SensorsLoadedAction>, unknown, unknown, SensorsLoadedAction> {
    return dispatch => readSensors(path)
        .then(codeSnippet => dispatch(successAction(SENSORS_LOADED, {codeSnippet, path})));
}

export function loadSensorsFromTemplate(path: string): ThunkAction<Promise<SensorsLoadedAction>, unknown, unknown, SensorsLoadedAction> {
    return dispatch => loadSensorsOrInitialize(path)
        .then(codeSnippet => dispatch(successAction(SENSORS_LOADED, {codeSnippet, path})));
}

export function saveSensors(path: string, codeSnippet: string): ThunkAction<Promise<SensorsSavedAction>, unknown, unknown, SensorsSavedAction> {
    return dispatch => persistEnvironment(path, codeSnippet)
        .then(() => dispatch(successAction(SENSORS_SAVED, {codeSnippet, path})));
}