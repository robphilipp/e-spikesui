import {ThunkAction, ThunkDispatch} from "redux-thunk";
import {SettingsAction} from "./settings";
import {NetworkDescriptionAction} from "./networkDescription";
import {Either} from "prelude-ts";
// import {NetworkBuiltAction, NetworkManagementAction} from "./networkManagement";
// import {NetworkEventAction, NetworkEventsAction} from "./networkEvent";
// import {NetworkVisualizationAction} from "./networkVisualization";

/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
export const SET_ERROR_MESSAGES = "set-error-messages";
export const CLEAR_ERROR_MESSAGES = "clear-error-messages";

/*
 |
 | Action definitions (for use by the reducers)
 |
 */
/**
 * The definition of an action that is dispatched when the error messages should be cleared
 */
export interface ErrorMessageClearedAction {
    type: typeof CLEAR_ERROR_MESSAGES
}

/**
 * The definition of an action that is dispatched when the error messages should be set
 */
export interface ErrorMessageSetAction {
    type: typeof SET_ERROR_MESSAGES;
    messages: string[];
}

/**
 * Lists all the actions that are part of the application action
 */
export type ApplicationAction = ErrorMessageSetAction
    | ErrorMessageClearedAction
    // | NetworkManagementAction
    | SettingsAction
    // | NetworkBuiltAction
    // | NetworkEventAction
    // | NetworkEventsAction
    // | NetworkVisualizationAction
    | NetworkDescriptionAction
    ;

/**
 * Sets the application-level error messages
 * @param messages An array of error messages
 * @return An action to that the error message has been set
 */
export function setErrorMessages(messages: string[]): ErrorMessageSetAction {
    return {
        type: SET_ERROR_MESSAGES,
        messages: messages
    };
}
// export function setErrorMessages(messages: string[]):
//     ThunkAction<Promise<SetErrorMessageAction>, unknown, unknown, SetErrorMessageAction> {
//     return (dispatch: ThunkDispatch<SetErrorMessageAction, unknown, SetErrorMessageAction>): Promise<SetErrorMessageAction> =>
//         Promise.resolve().then(() => dispatch({
//             type: SET_ERROR_MESSAGES,
//             messages: messages
//         }))
// }

/**
 * Clears the application-level error messages
 * @return An action that the error message has been cleared
 */
export function clearErrorMessages(): ErrorMessageClearedAction {
    return {
        type: CLEAR_ERROR_MESSAGES
    };
}
// export function clearErrorMessages(): ThunkAction<Promise<ClearErrorMessageAction>, unknown, unknown, ClearErrorMessageAction> {
//     return (dispatch: ThunkDispatch<ClearErrorMessageAction, unknown, ClearErrorMessageAction>): Promise<ClearErrorMessageAction> =>
//         Promise.resolve().then(() => dispatch({
//             type: CLEAR_ERROR_MESSAGES
//         }))
// }

/*
 |
 | Redux action creators for thunk responses
 | (functions that return functions that return promises)
 |
 */
/**
 * @example
 * // create a type that holds the keys of the successful response action
 * type Keys = 'description' | 'path';
 *
 * // may want to export these so that they can be used in the reducer
 * export const LOADED = 'loaded';
 * export const CHANGED = 'changed';
 * export const SAVED = 'saved';
 *
 * // loaded and saved are thunk action response (you may want to export
 * // this as well)
 * export type LoadedAction = ResponseAction<typeof LOADED, Keys, string>;
 * export type SavedAction = ResponseAction<typeof SAVED, Keys, string>;
 *
 * // changed is a regular redux action (you may want to export this
 * // as well)
 * export interface UpdatedAction {
 *   type: typeof CHANGED;
 *   result: string;
 * }
 *
 * // the result (you may want to export this as well) returned in the thunk
 * // action
 * export interface Result extends Record<Keys, string> {
 *   description: string;
 *   path: string;
 * }
 *
 * // and then one of the action creators
 * export function loadFrom(path: string): ThunkAction<Promise<LoadedAction>, unknown, unknown, LoadedAction> {
 * // the `readFrom(path: string)` function returns a Promise
 *   return dispatch => readFrom(path)
 *       // on success dispatch the success action, that takes the `Result` as the second parameter
 *       .then(description => dispatch(successAction(LOADED, {description, path})))
 *       // on failure, send the reason
 *       .catch(reason => dispatch(failedAction(LOADED, [reason.message])))
 * }
 */

/**
 * The key type of the successful response action object
 */
export type KeyType = string | number | symbol;

/**
 * Generic action to a response that is either a success of failure. For example, a call to load
 * the network description from a file can either succeed or fail. In this case, the response
 * action would be a `NETWORK_DESCRIPTION_LOADED` action type, and the ResponseAction would be
 * a `NetworkDescriptionLoadedAction`.
 */
export interface ResponseAction<A, K extends KeyType, V> {
    type: A;
    result: Either<string[], Record<K, V>>
}

/**
 * When an action response was a failure, creates an action that represents that failure. Holds the response
 * action type and the failure/error messages.
 * @param messages An array of error messages
 * @param actionType The response type, which determines the action that is created. For
 * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
 * @return The action that the response of an attempted action have been received. For
 * example, if the action was to build a network, then this is called if that request failed
 */
export function failedAction<A, K extends KeyType, V>(actionType: A, messages: string[]): ResponseAction<A, K, V> {
    return {
        type: actionType,
        result: Either.left(messages)
    }
}

/**
 * When an action response was a success, creates an action that represents that success. Holds the response
 * action type and result string.
 * @param result The result represented as a string (for example, this could be the network ID)
 * @param actionType The response type, which determines the action that is created. For
 * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
 * @return The action that the response of an attempted action have been received. For
 * example, if the action was to build a network, then this is called if that request succeeded.
 */
export function successAction<A, K extends KeyType, V, R extends Record<K, V>>(actionType: A, result: R): ResponseAction<A, K, V> {
    return {
        type: actionType,
        result: Either.right(result)
    }
}

