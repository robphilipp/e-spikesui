import {Either} from "prelude-ts";
import fs from "fs";
import {ApplicationSettings, SETTINGS_PATH} from "../settings/appSettings";

/**
 * Attempts to read the application settings from file. Returns either the application settings, or
 * a failure message.
 * @return The left is an error; the right are the application
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
 * @param settings The application settings to save
 * @return The left is an error; the right (undefined) is a success
 */
export function saveSettings(settings: ApplicationSettings): Either<string, void> {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
        return Either.right(undefined)
    } catch(err) {
        return Either.left(err.toString());
    }
}

/**
 * Asynchronous version to save the application settings to file. Returns either an error, or a void
 * if the settings were successfully saved.
 * @param settings The application settings to save
 * @return A promise for saving the file
 */
export function saveSettingsAsync(settings: ApplicationSettings): Promise<void> {
    return new Promise((resolve, reject) => {
        saveSettings(settings)
            .ifRight(() => resolve())
            .ifLeft(error => reject(error))
    })
}
