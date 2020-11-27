import * as React from 'react'
import {ITheme, Stack, TextField} from "@fluentui/react";
import TemplateSettings from "./templateSettings";
import {FormEvent, useState} from "react";

const filePathRegex = /^([.]?[a-zA-Z]+)?[a-zA-Z0-9._-]*$/
enum Setting {
    NETWORK_DESCRIPTION = 'network description',
    ENVIRONMENT = 'environment'
}

interface Props {
    theme: ITheme;
    settings: TemplateSettings;
    onChange: (settings: TemplateSettings) => void;
}

export default function TemplateSettingsEditor(props: Props): JSX.Element {
    const {
        theme,
        settings,
        onChange
    } = props;

    const [networkDescriptionError, setNetworkDescriptionError] = useState<string>(errorMessage(settings.networkDescriptionPath, Setting.NETWORK_DESCRIPTION));
    const [environmentError, setEnvironmentError] = useState<string>(errorMessage(settings.sensorDescriptionPath, Setting.ENVIRONMENT));

    /**
     * Returns an error message if the hostname or IP are not valid, and an empty string if the
     * hostname or IP address is valid
     * @param path The file path
     * @param setting The setting to which the error applies
     * @return An empty string if the file path is valid; otherwise an error message
     */
    function errorMessage(path: string, setting: string): string {
        if (path.match(filePathRegex) === null) {
            return `Invalid file path for ${setting} template`;
        }
        return '';
    }

    /**
     * Handles changes to the file path for the network description template
     * @param event The change event
     * @param path The file path of the network description template
     */
    function handleNetworkDescriptionChange(event: FormEvent<HTMLInputElement>, path: string = settings.networkDescriptionPath): void {
        setNetworkDescriptionError(errorMessage(path, Setting.NETWORK_DESCRIPTION))
        onChange({...settings, networkDescriptionPath: path})
    }

    /**
     * Handles changes to the file path for the network environment template
     * @param event The change event
     * @param path The file path of the network environment template
     */
    function handleSensorDescriptionChange(event: FormEvent<HTMLInputElement>, path: string = settings.sensorDescriptionPath): void {
        setEnvironmentError(errorMessage(path, Setting.ENVIRONMENT))
        onChange({...settings, sensorDescriptionPath: path})
    }

    return (
        <Stack>
            <TextField
                label="Network Description:"
                onChange={handleNetworkDescriptionChange}
                value={settings.networkDescriptionPath}
                errorMessage={networkDescriptionError}
                styles={{errorMessage: {color: theme.palette.redDark}}}
                underlined
            />
            <TextField
                label="Sensor Description:"
                onChange={handleSensorDescriptionChange}
                value={`${settings.sensorDescriptionPath}`}
                errorMessage={environmentError}
                styles={{errorMessage: {color: theme.palette.redDark}}}
                underlined
            />
        </Stack>
    )

}