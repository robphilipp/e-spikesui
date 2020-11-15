import {ITheme} from "@uifabric/styling";
import {HashMap} from "prelude-ts";
import {createDefaultTheme, createTheme, defaultPalettes, Palette} from "../../../theming";
import {
    CHANGE_THEME,
    KAFKA_SETTINGS_CHANGED,
    NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED,
    SettingsAction
} from "../actions/settings";
import {KafkaSettings} from "../../settings/kafkaSettings";
import {loadOrInitializeSetting} from "../../settings/appSettings";
import ServerSettings from "../../settings/serverSettings";
import {NetworkDescriptionSettings} from "../../settings/networkDescriptionSettings";
import {EnvironmentSettings} from "../../settings/environmentSettings";

/**
 * The state holding the application settings
 */
export interface SettingsState {
    itheme: ITheme;
    name: string;
    palettes: HashMap<string, Palette>;
    server: ServerSettings;
    kafka: KafkaSettings;
    networkDescription: NetworkDescriptionSettings;
    environment: EnvironmentSettings;
}

/**
 * Loads the settings from file and returns the initial settings.
 * @return The initial settings state based on the settings file
 */
function initialSettings(): SettingsState {
    const settings = loadOrInitializeSetting();
    return {
        name: settings.themeName,
        itheme: createDefaultTheme(settings.themeName).theme,
        palettes: defaultPalettes,
        server: settings.server,
        kafka: settings.kafka,
        networkDescription: settings.networkDescription,
        environment: settings.environment
    }
}

/**
 * Reducer function that accepts the current state and action, and for change theme actions, updates the
 * state with the new theme and returns the updated state.
 * @param state The current state of the theme
 * @param action The action holding the new state information
 * @return the updated state
 */
export function settingsReducer(state = initialSettings(), action: SettingsAction): SettingsState {
    switch (action.type) {
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

        case NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED:
            return {
                ...state,
                networkDescription: action.networkDescriptionSettings
            };

        default:
            return state;
    }
}
