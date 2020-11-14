import {
    loadTemplateOrInitialize,
    readNetworkDescription,
    saveNetworkDescription as persistNetworkDescription
} from '../../repos/networkDescriptionRepo';
import {ThunkAction} from "redux-thunk";
import {failedAction, ResponseAction, successAction} from "./actions";

/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
export const NETWORK_DESCRIPTION_LOADED = 'network-description-loaded';
export const NETWORK_DESCRIPTION_CHANGED = 'network-description-changed';
export const NETWORK_DESCRIPTION_SAVED = 'network-description-saved';

export const SAVE_NETWORK_DESCRIPTION = 'save-network-description';

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

/**
 * The definition of an action that is dispatched when the network description is loaded. This
 * can result in either a success (either.right) or a failure (either.left). When the result is
 * a success, then the right-side holds the network description. When the result is a failure,
 * then the left side holds the array of error messages.
 */
export type NetworkDescriptionLoadedAction = ResponseAction<typeof NETWORK_DESCRIPTION_LOADED, NetworkDescriptionResult, string[]>;
export type NetworkDescriptionSavedAction = ResponseAction<typeof NETWORK_DESCRIPTION_SAVED, NetworkDescriptionResult, string[]>;

/**
 * Action to be dispatched when network description has changed
 */
export interface NetworkDescriptionUpdatedAction {
    type: typeof NETWORK_DESCRIPTION_CHANGED;
    networkDescription: string;
}

/**
 * The response-action types is one of loaded, saved, or changed
 */
export type ResponseActionType = typeof NETWORK_DESCRIPTION_LOADED |
    typeof NETWORK_DESCRIPTION_SAVED |
    typeof NETWORK_DESCRIPTION_CHANGED
    ;

/**
 * The response type of the network description actions
 */
export interface NetworkDescriptionResult {
    description: string;
    path: string;
}


export type NetworkDescriptionAction = NetworkDescriptionLoadedAction
    | NetworkDescriptionUpdatedAction
    | NetworkDescriptionSavedAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

/**
 * An action creator that returns an action that the network description has been updated
 * @param description The updated network description
 * @return An action
 */
export function updateNetworkDescription(description: string): NetworkDescriptionUpdatedAction {
    return {
        type: NETWORK_DESCRIPTION_CHANGED,
        networkDescription: description
    }
}

/**
 * Action created to load a network description from file
 * @param path The path to the network description file to load
 * @return A thunk action (a function that returns a promise to a NetworkDescriptionLoadedAction) that
 * is dispatched by redux
 */
export function loadNetworkDescriptionFrom(path: string): ThunkAction<Promise<NetworkDescriptionLoadedAction>, unknown, unknown, NetworkDescriptionLoadedAction> {
    return dispatch => readNetworkDescription(path)
        .then(description => dispatch(successAction(NETWORK_DESCRIPTION_LOADED, {description, path})))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_LOADED, [reason])))
}

/**
 * Action created to load a network description template from file
 * @param path The path to the network description template file to load
 * @return A thunk action (a function that returns a promise to a NetworkDescriptionLoadedAction) that
 * is dispatched by redux
 */
export function loadNetworkDescriptionFromTemplate(path: string): ThunkAction<Promise<NetworkDescriptionLoadedAction>, unknown, unknown, NetworkDescriptionLoadedAction> {
    return dispatch => loadTemplateOrInitialize(path)
        .then(description => dispatch(successAction(NETWORK_DESCRIPTION_LOADED, {description, path})))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_LOADED, [reason])))
}

/**
 * Action creator to save the network description to file
 * @param path The file path
 * @param description The network description to sae
 * @return A thunk action (a function that returns a promise to a NetworkDescriptionSavedAction) that
 * is dispatched by redux
 */
export function saveNetworkDescription(path: string, description: string): ThunkAction<Promise<NetworkDescriptionSavedAction>, unknown, unknown, NetworkDescriptionSavedAction> {
    return dispatch => persistNetworkDescription(path, description)
        .then(() => dispatch(successAction(NETWORK_DESCRIPTION_SAVED, {description, path})))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_SAVED, [reason])))
}