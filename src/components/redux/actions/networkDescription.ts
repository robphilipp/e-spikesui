import {
    loadTemplateOrInitialize,
    readNetworkDescription,
    saveNetworkDescription as persistNetworkDescription
} from '../../network/networkDescription';
import {ThunkAction} from "redux-thunk";
import {Either} from 'prelude-ts';

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
export type NetworkDescriptionLoadedAction = ResponseAction<typeof NETWORK_DESCRIPTION_LOADED>;
export type NetworkDescriptionSavedAction = ResponseAction<typeof NETWORK_DESCRIPTION_SAVED>;

/**
 * Action when network description has changed
 */
export interface NetworkDescriptionUpdateAction {
    type: typeof NETWORK_DESCRIPTION_CHANGED;
    networkDescription: string;
}

/**
 * The response-action types
 */
export type ResponseActionType = typeof NETWORK_DESCRIPTION_LOADED |
    typeof NETWORK_DESCRIPTION_SAVED |
    typeof NETWORK_DESCRIPTION_CHANGED
    ;

export type KeyValues = {[key: string]: string}

export interface NetworkDescriptionResult extends KeyValues{
    description: string;
    path: string;
}

/**
 * Generic action to a response that is either a success of failure. For example, a call to load
 * the network description from a file can either succeed or fail. In this case, the response
 * action would be a `NETWORK_DESCRIPTION_LOADED` action type, and the ResponseAction would be
 * a `NetworkDescriptionLoadedAction`.
 */
export interface ResponseAction<T extends ResponseActionType> {
    type: T;
    result: Either<string[], KeyValues>
}


export type NetworkDescriptionAction = NetworkDescriptionLoadedAction
    | NetworkDescriptionUpdateAction
    | NetworkDescriptionSavedAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */
/**
 * When an action response was a failure, creates an action that represents that failure. Holds the response
 * action type and the failure/error messages.
 * @param {string[]} messages An array of error messages
 * @param {ResponseActionType} actionType The response type, which determines the action that is created. For
 * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
 * @return {ResponseAction<T>} The action that the response of an attempted action have been received. For
 * example, if the action was to build a network, then this is called if that request failed
 * @private
 */
function failedAction<T extends ResponseActionType>(actionType: T, messages: string[]): ResponseAction<T> {
    return {
        type: actionType,
        result: Either.left(messages)
    }
}

/**
 * When an action response was a success, creates an action that represents that success. Holds the response
 * action type and result string.
 * @param {string} result The result represented as a string (for example, this could be the network ID)
 * @param {ResponseActionType} actionType The response type, which determines the action that is created. For
 * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
 * @return {ResponseAction<T>} The action that the response of an attempted action have been received. For
 * example, if the action was to build a network, then this is called if that request succeeded.
 * @private
 */
function successAction<T extends ResponseActionType, R extends KeyValues>(actionType: T, result: R): ResponseAction<T> {
    return {
        type: actionType,
        result: Either.right(result)
    }
}

export function updateNetworkDescription(description: string): NetworkDescriptionUpdateAction {
    return {
        type: NETWORK_DESCRIPTION_CHANGED,
        networkDescription: description
    }
}

export function loadNetworkDescriptionFrom(path: string):
    ThunkAction<Promise<NetworkDescriptionLoadedAction>, unknown, unknown, NetworkDescriptionLoadedAction> {
    return dispatch => readNetworkDescription(path)
        .then(description => dispatch(successAction(NETWORK_DESCRIPTION_LOADED, {path, description} as NetworkDescriptionResult)))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_LOADED, reason)))
}

export function loadNetworkDescriptionFromTemplate(path: string):
    ThunkAction<Promise<NetworkDescriptionLoadedAction>, unknown, unknown, NetworkDescriptionLoadedAction> {
    return dispatch => loadTemplateOrInitialize(path)
        .then(description => dispatch(successAction(NETWORK_DESCRIPTION_LOADED, {path, description} as NetworkDescriptionResult)))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_LOADED, reason)))
}


/**
 * Proactive action creator to save the network description to file
 * @param path The file path
 * @param description The network description to sae
 */
export function saveNetworkDescription(path: string, description: string):
    ThunkAction<Promise<NetworkDescriptionSavedAction>, unknown, unknown, NetworkDescriptionSavedAction> {
    return dispatch => persistNetworkDescription(path, description)
        .then(() => dispatch(successAction(NETWORK_DESCRIPTION_SAVED, {path, description} as NetworkDescriptionResult)))
        .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_SAVED, reason)))
}