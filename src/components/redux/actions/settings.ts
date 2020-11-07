/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */

// import {KafkaSettings} from "../../components/settings/KafkaSettings";

import {KafkaSettings} from "../../settings/kafkaSettings";
import ServerSettings from "../../settings/serverSettings";
import {NetworkDescriptionSettings} from "../../settings/networkDescriptionSettings";

export const CHANGE_THEME = "change-theme";
export const SETTINGS_PANEL_VISIBLE = "settings-panel-visible";
export const SERVER_SETTINGS_CHANGED = "server-settings-changed";
export const KAFKA_SETTINGS_CHANGED = "kafka-settings-changed";
export const NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED = "network-description-template-path-changed";

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

/**
 * The action for managing the setting panel's visibility
 */
export interface SettingsPanelVisibleAction {
    type: typeof SETTINGS_PANEL_VISIBLE;
    visible: boolean;
}

/**
 * The action for changing the themes name
 */
export interface ChangeThemeAction {
    type: typeof CHANGE_THEME;
    theme: string;
}

export interface ServerSettingsChangeAction {
    type: typeof SERVER_SETTINGS_CHANGED;
    serverSettings: ServerSettings;
}

export interface KafkaSettingsChangeAction {
    type: typeof KAFKA_SETTINGS_CHANGED;
    kafkaSettings: KafkaSettings;
}

export interface NetworkDescriptionTemplatePathChangeAction {
    type: typeof NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED;
    networkDescriptionSettings: NetworkDescriptionSettings;
}

export type SettingsAction = ChangeThemeAction
    | SettingsPanelVisibleAction
    | ServerSettingsChangeAction
    | KafkaSettingsChangeAction
    | NetworkDescriptionTemplatePathChangeAction
    ;


/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

/**
 * Action to show the application settings panel
 * @return {SettingsPanelVisibleAction}
 */
export function showSettingsPanel(): SettingsPanelVisibleAction {
    return {
        type: SETTINGS_PANEL_VISIBLE,
        visible: true
    }
}

/**
 * Action to hide the settings panel
 * @return {SettingsPanelVisibleAction}
 */
export function hideSettingsPanel(): SettingsPanelVisibleAction {
    return {
        type: SETTINGS_PANEL_VISIBLE,
        visible: false
    }
}

/**
 * Action to change the UI theme
 * @param name The name of the new theme
 * @return The action
 */
export function changeTheme(name: string): ChangeThemeAction {
    return {
        type: CHANGE_THEME,
        theme: name
    }
}

/**
 * Action to change the settings for connecting to the spikes server
 * @param settings The server settings (host, port, base URL)
 * @return The change action
 */
export function changeServerSettings(settings: ServerSettings): ServerSettingsChangeAction {
    return {
        type: SERVER_SETTINGS_CHANGED,
        serverSettings: settings
    }
}

/**
 * Action to update the kafka settings
 * @param settings The updated kafka settings
 * @return An action to update the kafka settings
 */
export function changeKafkaSettings(settings: KafkaSettings): KafkaSettingsChangeAction {
    return {
        type: KAFKA_SETTINGS_CHANGED,
        kafkaSettings: settings
    }
}

/**
 * Action to update the path to the network-description template
 * @param path The new path to the template
 * @return The action representing the change to the path
 */
export function updateNetworkDescriptionTemplatePath(path: string): NetworkDescriptionTemplatePathChangeAction {
    return {
        type: NETWORK_DESCRIPTION_TEMPLATE_PATH_CHANGED,
        networkDescriptionSettings: {templatePath: path}
    }
}
