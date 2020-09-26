/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */

// import {KafkaSettings} from "../../components/settings/KafkaSettings";

export const CHANGE_THEME = "change-theme";
export const SETTINGS_PANEL_VISIBLE = "settings-panel-visible";
export const KAFKA_SETTINGS_CHANGED = "kafka-settings-changed";

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

// export interface KafkaSettingsChangeAction {
//     type: typeof KAFKA_SETTINGS_CHANGED;
//     kafkaSettings: KafkaSettings;
// }

export type SettingsAction = ChangeThemeAction
    | SettingsPanelVisibleAction
    // | KafkaSettingsChangeAction
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
export const showSettingsPanel = (): SettingsPanelVisibleAction => ({
    type: SETTINGS_PANEL_VISIBLE,
    visible: true
});

/**
 * Action to hide the settings panel
 * @return {SettingsPanelVisibleAction}
 */
export const hideSettingsPanel = (): SettingsPanelVisibleAction => ({
    type: SETTINGS_PANEL_VISIBLE,
    visible: false
});

/**
 * Action to change the UI theme
 * @param {string} theme
 * @return {ChangeThemeAction}
 */
export const changeTheme = (theme: string): ChangeThemeAction => ({
    type: CHANGE_THEME,
    theme: theme
});

// /**
//  * Action to update the kafka settings
//  * @param {KafkaSettings} settings The updated kafka settings
//  * @return {KafkaSettingsChangeAction} An action to update the kafka settings
//  */
// export const changeKafkaSettings = (settings: KafkaSettings): KafkaSettingsChangeAction => ({
//     type: KAFKA_SETTINGS_CHANGED,
//     kafkaSettings: settings
// });
