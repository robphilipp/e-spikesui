import {
    KAFKA_SETTINGS_CHANGED,
    NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED,
    SENSOR_DESCRIPTION_TEMPLATE_PATH_CHANGED,
    SERVER_SETTINGS_CHANGED,
    SettingsAction
} from "../actions/settings";
import {KafkaSettings} from "../../settings/kafkaSettings";
import {loadOrInitializeSetting} from "../../settings/appSettings";
import ServerSettings from "../../settings/serverSettings";
import {NetworkDescriptionSettings} from "../../settings/networkDescriptionSettings";
import {SensorDescriptionSettings} from "../../settings/sensorDescriptionSettings";

/**
 * The state holding the application settings
 */
export interface SettingsState {
    server: ServerSettings;
    kafka: KafkaSettings;
    networkDescription: NetworkDescriptionSettings;
    sensorDescription: SensorDescriptionSettings;
}

/**
 * Loads the settings from file and returns the initial settings.
 * @return The initial settings state based on the settings file
 */
function initialSettings(): SettingsState {
    const settings = loadOrInitializeSetting();
    return {
        server: settings.server,
        kafka: settings.kafka,
        networkDescription: settings.networkDescription,
        sensorDescription: settings.sensorDescription,
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
        case KAFKA_SETTINGS_CHANGED:
            return {
                ...state,
                kafka: action.kafkaSettings
            };

        case SERVER_SETTINGS_CHANGED:
            return {
                ...state,
                server: action.serverSettings
            }

        case NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED:
            return {
                ...state,
                networkDescription: action.networkDescriptionSettings,
            };

        case SENSOR_DESCRIPTION_TEMPLATE_PATH_CHANGED:
            return {
                ...state,
                sensorDescription: action.sensorDescriptionSettings,
            };

        default:
            return state;
    }
}
