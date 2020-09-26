// import {Option} from "prelude-ts";
import {ApplicationAction, CLEAR_ERROR_MESSAGES, SET_ERROR_MESSAGES} from "../actions/actions";
import {SETTINGS_PANEL_VISIBLE} from "../actions/settings";

interface ApplicationState {
    // errorMessages: Option<string[]>;
    settingsPanelVisible: boolean;
}

const initialState: ApplicationState = {
    // errorMessages: Option.none<string[]>(),
    settingsPanelVisible: false
};

/**
 * Accepts the current state and the action and returns an updated state
 * @param {ApplicationState} state The current state
 * @param {ApplicationAction} action The action that triggered the state change
 * @return {ApplicationState} The updated state
 */
export function applicationReducer(state = initialState, action: ApplicationAction): ApplicationState {
    switch (action.type) {
        // case CLEAR_ERROR_MESSAGES:
        //     return {
        //         ...state,
        //         errorMessages: Option.none<string[]>()
        //     };
        //
        // case SET_ERROR_MESSAGES:
        //     return {
        //         ...state,
        //         errorMessages: Option.some<string[]>(action.messages)
        //     };

        case SETTINGS_PANEL_VISIBLE:
            return {
                ...state,
                settingsPanelVisible: action.visible
            };

        default:
            return state;
    }
}
