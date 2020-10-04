import ServerSettings from "./serverSettings";
import {KafkaSettings} from "./kafkaSettings";
import * as fs from "fs";
import {Either} from "prelude-ts";

export interface ApplicationSettings {
    themeName: string;
    server: ServerSettings;
    kafka: KafkaSettings
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
    }
}

/**
 * Loads the application settings from `SETTINGS_PATH` or, in the event that the settings couldn't be
 * read, writes the default settings to the settings path and returns the default settings.
 * @return {ApplicationSettings} The application settings
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

/**
 * Attempts to read the application settings from file. Returns either the application settings, or
 * a failure message.
 * @return {Either<string, ApplicationSettings>} The left is an error; the right are the application
 * settings
 */
export function readSettings(): Either<string, ApplicationSettings> {
    try {
        const buffer = fs.readFileSync(SETTINGS_PATH);
        const settings: ApplicationSettings = JSON.parse(buffer.toString())
        return Either.right(settings);
    } catch(err) {
        return Either.left(err.toString())
    }
}

/**
 * Attempts to save the application settings to file. Returns either an error, or a void if the settings
 * were successfully saved.
 * @param {ApplicationSettings} settings The application settings to save
 * @return {Either<string, void>} The left is an error; the right (undefined) is a success
 */
export function saveSettings(settings: ApplicationSettings): Either<string, void> {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
        return Either.right(undefined)
    } catch(err) {
        return Either.left(err.toString());
    }
}
