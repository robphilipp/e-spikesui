import ServerSettings from "./serverSettings";
import {KafkaSettings} from "./kafkaSettings";
import {NetworkDescriptionSettings} from "./networkDescriptionSettings";
import {readSettings, saveSettings} from "../repos/appSettingsRepo";

export interface ApplicationSettings {
    themeName: string;
    server: ServerSettings;
    kafka: KafkaSettings;
    networkDescription: NetworkDescriptionSettings;
}

export const SETTINGS_PATH = '.spikes-ui'
export const DEFAULT_SETTINGS: ApplicationSettings = {
    themeName: 'dark',
    server: {
        host: 'localhost',
        port: 3000,
        basePath: ''
    },
    kafka: {
        brokers: [
            {host: 'localhost', port: 9092},
            {host: 'localhost', port: 9093},
        ]
    },
    networkDescription: {
        templatePath: '.spikes-network-template',
    }
}

/**
 * Loads the application settings from `SETTINGS_PATH` or, in the event that the settings couldn't be
 * read, writes the default settings to the settings path and returns the default settings.
 * @return The application settings
 */
export function loadOrInitializeSetting(): ApplicationSettings {
    return readSettings()
        .ifLeft(err => {
            console.log(`Unable to read settings; path: ${SETTINGS_PATH}; error: ${err.toString()}`)
            saveSettings(DEFAULT_SETTINGS).ifLeft(err => {
                console.log(`Unable to write default settings; path: ${SETTINGS_PATH}; error: ${err.toString()}`)
            });
        })
        .getOrElse(DEFAULT_SETTINGS)
}
