import {ITheme} from "@uifabric/styling";
import {HashMap} from "prelude-ts";
import {createDefaultTheme, createTheme, defaultPalettes, Palette} from "../../../theming";
import {CHANGE_THEME, KAFKA_SETTINGS_CHANGED, SettingsAction} from "../actions/settings";
import {KafkaSettings} from "../../settings/KafkaSettings";

/**
 * The state holding the application settings
 */
export interface SettingsState {
    itheme: ITheme;
    name: string;
    palettes: HashMap<string, Palette>;
    kafka: KafkaSettings;
}

/**
 * The initial settings
 */
const initialSettingsState: SettingsState = {
    itheme: createDefaultTheme("dark").theme,
    name: "dark",
    palettes: defaultPalettes,
    kafka: {brokers: [{host: 'localhost', port: 9092}, {host: 'localhost', port: 9093}]}
};

/**
 * Reducer function that accepts the current state and action, and for change theme actions, updates the
 * state with the new theme and returns the updated state.
 * @param {SettingsState} state The current state of the theme
 * @param {SettingsAction} action The action holding the new state information
 * @return {SettingsState} the updated state
 */
export function settingsReducer(state= initialSettingsState, action: SettingsAction): SettingsState {
    switch(action.type) {
        case CHANGE_THEME:
            console.log(`settings -- theme; action type: ${action.type}; theme: ${action.theme}`);
            return {
                ...state,
                name: action.theme,
                itheme: createTheme(action.theme, state.palettes).theme,
            };

        case KAFKA_SETTINGS_CHANGED:
            return {
                ...state,
                kafka: action.kafkaSettings
            };

        default:
            return state;
    }
}
