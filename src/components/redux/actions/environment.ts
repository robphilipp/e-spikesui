/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
import {ResponseAction, successAction} from "./actions";
import {ThunkAction} from "redux-thunk";
import {
    loadEnvironmentOrInitialize,
    readEnvironment,
    saveEnvironment as persitEnvironment
} from "../../repos/environmentRepo";

export const ENVIRONMENT_LOADED = 'environment-loaded';
export const ENVIRONMENT_CHANGED = 'environment-changed';
export const ENVIRONMENT_SAVED = 'environment-saved';

/*
 |
 | Action definitions (for use by the reducers)
 |
 */
export interface EnvironmentResult {
    codeSnippet: string;
    path: string;
}

export type EnvironmentLoadedAction = ResponseAction<typeof ENVIRONMENT_LOADED, EnvironmentResult>;
export type EnvironmentSavedAction = ResponseAction<typeof ENVIRONMENT_SAVED, EnvironmentResult>;

export interface EnvironmentUpdatedAction {
    type: typeof ENVIRONMENT_CHANGED;
    codeSnippet: string;
}

export type ResponseActionType = typeof ENVIRONMENT_LOADED
    | typeof ENVIRONMENT_SAVED
    | typeof ENVIRONMENT_CHANGED;

export type EnvironmentAction = EnvironmentLoadedAction
    | EnvironmentUpdatedAction
    | EnvironmentSavedAction;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */
export function updateEnvironment(codeSnippet: string): EnvironmentUpdatedAction {
    return {
        type: ENVIRONMENT_CHANGED,
        codeSnippet: codeSnippet
    }
}

export function loadEnvironmentFrom(path: string): ThunkAction<Promise<EnvironmentLoadedAction>, unknown, unknown, EnvironmentLoadedAction> {
    return dispatch => readEnvironment(path)
        .then(codeSnippet => dispatch(successAction(ENVIRONMENT_LOADED, {codeSnippet, path})));
}

export function loadEnvironmentFromTemplate(path: string): ThunkAction<Promise<EnvironmentLoadedAction>, unknown, unknown, EnvironmentLoadedAction> {
    return dispatch => loadEnvironmentOrInitialize(path)
        .then(codeSnippet => dispatch(successAction(ENVIRONMENT_LOADED, {codeSnippet, path})));
}

export function saveEnvironment(path: string, codeSnippet: string): ThunkAction<Promise<EnvironmentSavedAction>, unknown, unknown, EnvironmentSavedAction> {
    return dispatch => persitEnvironment(path, codeSnippet)
        .then(() => dispatch(successAction(ENVIRONMENT_SAVED, {codeSnippet, path})));
}