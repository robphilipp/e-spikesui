import {SettingsAction} from "./settings";
import {NetworkDescriptionAction} from "./networkDescription";
import {SensorsAction} from "./sensors";
import {SimulationProjectAction} from "./simulationProject";
import {MessageBarType} from "@fluentui/react";
import {Option} from "prelude-ts";
import {NetworkBuiltAction, NetworkManagementAction} from "./networkManagement";
import {NetworkEventAction, NetworkEventsAction} from "./networkEvent";
import {NetworkVisualizationAction} from "./networkVisualization";

// import {NetworkBuiltAction, NetworkManagementAction} from "./networkManagement";
// import {NetworkEventAction, NetworkEventsAction} from "./networkEvent";
// import {NetworkVisualizationAction} from "./networkVisualization";

export interface FeedbackMessage {
    messageType: MessageBarType;
    messageContent: JSX.Element;
}

/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
export const SET_MESSAGE = "set-messages";
export const CLEAR_MESSAGE = "clear-messages";

export const SET_LOADING_STATE = "set-loading-state";
// export const CLEAR_LOADING = "clear-loading";

/*
 |
 | Action definitions (for use by the reducers)
 |
 */
/**
 * The definition of an action that is dispatched when the error messages should be cleared
 */
export interface MessageClearedAction {
    type: typeof CLEAR_MESSAGE
}

/**
 * The definition of an action that is dispatched when the error messages should be set
 */
export interface MessageSetAction {
    type: typeof SET_MESSAGE;
    message: Option<FeedbackMessage>;
}


// export interface SetLoadingAction {
//     type: typeof SET_LOADING;
// }
//
// export interface ClearLoadingAction {
//     type: typeof CLEAR_LOADING;
// }
//
// export type LoadingAction = SetLoadingAction | ClearLoadingAction;
export interface LoadingAction {
    type: typeof SET_LOADING_STATE;
    loading: boolean;
    message?: string;
}

/**
 * Lists all the actions that are part of the application action
 */
export type ApplicationAction = MessageSetAction
    | MessageClearedAction

    | LoadingAction

    | SettingsAction

    | NetworkBuiltAction
    | NetworkEventAction
    | NetworkEventsAction

    | NetworkVisualizationAction
    | NetworkDescriptionAction

    | NetworkManagementAction
    | SensorsAction
    | SimulationProjectAction
    ;

/**
 * Sets the application-level error messages
 * @param message A react element containing an error message
 * @return An action to that the error message has been set
 */
export function setErrorMessage(message: JSX.Element): MessageSetAction {
    return setMessage(MessageBarType.error, message);
}

export function setSuccessMessage(message: JSX.Element): MessageSetAction {
    return setMessage(MessageBarType.success, message);
}

export function setInfoMessage(message: JSX.Element): MessageSetAction {
    return setMessage(MessageBarType.info, message);
}

export function setMessage(messageType: MessageBarType, message: JSX.Element): MessageSetAction {
    return {
        type: SET_MESSAGE,
        message: Option.of({
            messageType: messageType,
            messageContent: message
        })
    };
}

/**
 * Clears the application-level error messages
 * @return An action that the error message has been cleared
 */
export function clearMessage(): MessageClearedAction {
    return {
        type: CLEAR_MESSAGE
    };
}

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
 * // the result (you may want to export this as well) returned in the thunk
 * // action
 * export interface Result {
 *   description: string;
 *   path: string;
 * }
 *
 * // loaded and saved are thunk action response (you may want to export
 * // this as well)
 * export type LoadedAction = ResponseAction<typeof LOADED, Result>;
 * export type SavedAction = ResponseAction<typeof SAVED, Result>;
 *
 * // changed is a regular redux action (you may want to export this
 * // as well)
 * export interface UpdatedAction {
 *   type: typeof CHANGED;
 *   result: string;
 * }
 *
 * // and then one of the action creators
 * export function loadFrom(path: string): ThunkAction<Promise<LoadedAction>, unknown, unknown, LoadedAction> {
 * // the `readFrom(path: string)` function returns a Promise
 *   return dispatch => readFrom(path)
 *       // on success dispatch the success action, that takes the `Result` as the second parameter
 *       .then(description => dispatch(successAction(LOADED, {description, path})))
 * }
 */

/**
 * Generic action to a response that is either a success of failure. For example, a call to load
 * the network description from a file can either succeed or fail. In this case, the response
 * action would be a `NETWORK_DESCRIPTION_LOADED` action type, and the ResponseAction would be
 * a `NetworkDescriptionLoadedAction`.
 * @template A The action type
 * @template K The key type, which must be a string, number, or symbol (`KeyType`)
 * @template V The value type of the result
 */
export interface ResponseAction<A, S> {
    type: A;
    result: S
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
export function successAction<A, S>(actionType: A, result: S): ResponseAction<A, S> {
    return {
        type: actionType,
        result: result
    }
}
