import {ApplicationAction, CLEAR_MESSAGE, FeedbackMessage, SET_LOADING_STATE, SET_MESSAGE} from "../actions/actions";
import {SETTINGS_PANEL_VISIBLE} from "../actions/settings";
import {Option} from "prelude-ts";

interface ApplicationState {
    loading: boolean;
    loadingMessage?: string;
    message: Option<FeedbackMessage>;
    settingsPanelVisible: boolean;
}

const initialState: ApplicationState = {
    loading: false,
    loadingMessage: 'loading...',
    message: Option.none<FeedbackMessage>(),
    settingsPanelVisible: false
};

/**
 * Accepts the current state and the action and returns an updated state
 * @param state The current state
 * @param action The action that triggered the state change
 * @return The updated state
 */
export function applicationReducer(state = initialState, action: ApplicationAction): ApplicationState {
    switch (action.type) {
        // whether or not the loading flag is set
        case SET_LOADING_STATE:
            return {
                ...state,
                loading: action.loading,
                loadingMessage: action.message
            };

        case CLEAR_MESSAGE:
            return {
                ...state,
                message: Option.none<FeedbackMessage>()
            };

        case SET_MESSAGE:
            return {
                ...state,
                message: action.message
            };

        case SETTINGS_PANEL_VISIBLE:
            return {
                ...state,
                settingsPanelVisible: action.visible
            };

        default:
            return state;
    }
}
