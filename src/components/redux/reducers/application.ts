import {ApplicationAction} from "../actions/actions";
import {SETTINGS_PANEL_VISIBLE} from "../actions/settings";

interface ApplicationState {
    settingsPanelVisible: boolean;
}

const initialState: ApplicationState = {
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
        case SETTINGS_PANEL_VISIBLE:
            return {
                ...state,
                settingsPanelVisible: action.visible
            };

        default:
            return state;
    }
}
