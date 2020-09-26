import {ThunkAction, ThunkDispatch} from "redux-thunk";
import {SettingsAction} from "./settings";
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
export interface ClearErrorMessageAction {
    type: typeof CLEAR_ERROR_MESSAGES
}

/**
 * The definition of an action that is dispatched when the error messages should be set
 */
export interface SetErrorMessageAction {
    type: typeof SET_ERROR_MESSAGES;
    messages: string[];
}

export type ApplicationAction = SetErrorMessageAction
    | ClearErrorMessageAction
    // | NetworkManagementAction
    | SettingsAction
    // | NetworkBuiltAction
    // | NetworkEventAction
    // | NetworkEventsAction
    // | NetworkVisualizationAction
    ;


/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

/**
 * Sets the application-level error messages
 * @param {string[]} messages An array of error messages
 * @return {ThunkAction<Promise<SetErrorMessageAction>, any, any, SetErrorMessageAction>}
 */
export function setErrorMessages(messages: string[]):
    ThunkAction<Promise<SetErrorMessageAction>, any, any, SetErrorMessageAction> {
    return (dispatch: ThunkDispatch<SetErrorMessageAction, any, any>): Promise<SetErrorMessageAction> =>
        Promise.resolve().then(() => dispatch({
            type: SET_ERROR_MESSAGES,
            messages: messages
        }))
}

/**
 * Clears the application-level error messages
 * @return {ThunkAction<Promise<ClearErrorMessageAction>, any, any, ClearErrorMessageAction>}
 */
export function clearErrorMessages(): ThunkAction<Promise<ClearErrorMessageAction>, any, any, ClearErrorMessageAction> {
    return (dispatch: ThunkDispatch<ClearErrorMessageAction, any, any>): Promise<ClearErrorMessageAction> =>
        Promise.resolve().then(() => dispatch({
            type: CLEAR_ERROR_MESSAGES
        }))
}
