import ServerSettings from "./serverSettings";
import {KafkaSettings} from "./kafkaSettings";
import * as fs from "fs";

export interface ApplicationSettings {
    server: ServerSettings;
    kafka: KafkaSettings
}

export const SETTINGS_PATH = '.spikes-ui'
export const DEFAULT_SETTINGS: ApplicationSettings = {
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

export function loadOrInitializeSetting(): ApplicationSettings {
    const [settings, err] = readSettingsFrom(SETTINGS_PATH);
    if (err) {
        writeSettingsTo(SETTINGS_PATH, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS
    }
    return settings
}

export function readSettings(): [settings: ApplicationSettings, error: string] {
    return readSettingsFrom(SETTINGS_PATH);
}

export function saveSettings(settings: ApplicationSettings): string {
    return writeSettingsTo(SETTINGS_PATH, settings);
}

function readSettingsFrom(path: string): [settings: ApplicationSettings, error: string] {
    try {
        const buffer = fs.readFileSync(path);
        const settings: ApplicationSettings = JSON.parse(buffer.toString())
        return [settings, undefined]
    } catch(err) {
        return [undefined, err.toString()]
    }
}

function writeSettingsTo(path: string, settings: ApplicationSettings): string {
    try {
        fs.writeFileSync(path, JSON.stringify(settings));
    } catch(err) {
        return err.toString();
    }
}
// export function settingsOrDefaults(): Promise<ApplicationSettings> {
//     return new Promise((resolve, reject) => {
//         return readSettings(SETTINGS_PATH)
//             .then(settings => resolve(settings))
//             .catch(reason => {
//                 console.log(`No settings exist; writing default settings to ${SETTINGS_PATH}; error: ${reason.toString()}`)
//                 return writeSettings(SETTINGS_PATH, DEFAULT_SETTINGS)
//                     .then(() => resolve(DEFAULT_SETTINGS))
//                     .catch(reason => reject(`Failed to write default settings to ${SETTINGS_PATH}; error: ${reason.toString()}`));
//             });
//     });
// }
//
// export function readSettings(path: string): Promise<ApplicationSettings> {
//     return new Promise((resolve, reject) => {
//         fs.readFile(path, (err, buffer) => {
//             if (err) {
//                 reject(`Unable to read settings from disk; path: ${path}; error: ${err.message}`)
//                 return;
//             }
//             try {
//                 const settings: ApplicationSettings = JSON.parse(buffer.toString())
//                 resolve(settings);
//             } catch(err) {
//                 reject(`Unable to parse file contents into application settings; error: ${err}; contents: ${buffer.toString()}`)
//             }
//         });
//     })
// }
//
// export function writeSettings(path: string, settings: ApplicationSettings): Promise<void> {
//     return new Promise((resolve, reject) => {
//         fs.writeFile(path, JSON.stringify(settings), err => {
//             if (err) {
//                 reject(`Unable to write settings to disk; path ${path}; error: ${err}`);
//                 return;
//             }
//             resolve();
//         })
//     })
// }