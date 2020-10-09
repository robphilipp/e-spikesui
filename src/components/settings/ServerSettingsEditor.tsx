import * as React from 'react';
import {FormEvent, useState} from 'react';
import ServerSettings from "./serverSettings";
import {ITheme, Stack, TextField} from '@fluentui/react';

interface Props {
    theme: ITheme;
    settings: ServerSettings;
    onChange: (settings: ServerSettings) => void;
}

const hostnameRegex = /^[a-zA-Z0-9_-]+[a-zA-Z0-9_\-\\.]*$/
const basePathRegex = /^(?!\/)[a-zA-Z0-9_-]*(\/[a-zA-Z0-9_-]+)*$/

/**
 * Panel that provides the user with an interface to view and update the server settings
 * @param {Props} props The props
 * @return {JSX.Element} The panel
 * @constructor
 */
export default function ServerSettingsEditor(props: Props): JSX.Element {
    const {theme, settings, onChange} = props;

    const [hostError, setHostError] = useState<string>(hostnameErrorMessage(settings.host));
    const [portError, setPortError] = useState<string>(portErrorMessage(settings.port));
    const [basePathError, setBasePathError] = useState<string>(basePathErrorMessage(settings.basePath));

    /**
     * Returns an error message if the hostname or IP are not valid, and an empty string if the
     * hostname or IP address is valid
     * @param {string} host The hostname or IP address
     * @return {string} An empty string if the hostname and IP address or valid; otherwise an error
     * message
     */
    function hostnameErrorMessage(host: string): string {
        if (host.match(hostnameRegex) === null) {
            return "Invalid hostname or IP address";
        }
        return '';
    }

    /**
     * Returns an error message if the port is not valid, and an empty string if it is valid.
     * @param {number} port The server port
     * @return {string} an error message if the port is not valid, and an empty string if it is valid
     */
    function portErrorMessage(port: number): string {
        if (port <= 0 || port > 65535) {
            return "Port must be a positive integer less than or equal to 65535";
        }
        return '';
    }

    /**
     * Returns an error message if the base path is not valid, and an empty string if it is valid.
     * @param {string} basePath The base path for the REST endpoints
     * @return {string} an error message if the base path is not valid, and an empty string if it is valid
     */
    function basePathErrorMessage(basePath: string): string {
        if (basePath.match(basePathRegex) === null) {
            return "Invalid base path. The base path can only contain number, characters, dashes, underscores, " +
                "forward slashes, and cannot start of end with a forward slash."
        }
        return '';
    }

    /**
     * Handles changes to the hostname or IP address
     * @param {React.FormEvent<HTMLInputElement>} event The change event
     * @param {string} host The new hostname or IP address
     */
    function handleHostChange(event: FormEvent<HTMLInputElement>, host: string = settings.host): void {
        setHostError(hostnameErrorMessage(host))
        onChange({...settings, host})
    }

    /**
     * Handles changes to the part
     * @param {React.FormEvent<HTMLInputElement>} event The change event
     * @param {string} portString The new port number represented as a string
     */
    function handlePortChange(event: FormEvent<HTMLInputElement>, portString: string = settings.port.toString()): void {
        // if the port string is undefined or empty, then just set a zero, and show an error
        if (portString.length === 0) {
            setPortError("Port must be a positive integer");
            onChange({...settings, port: 0});
            return;
        }

        // attempt to parse the port string into an integer and ensure that it is a valid
        // port number
        const port = parseInt(portString);
        if (isNaN(port)) {
            setPortError("Port may only have digits and must be a positive integer");
            return;
        }
        setPortError(portErrorMessage(port));
        onChange({...settings, port});
    }

    /**
     * Handles changes to the base path for making rest calls
     * @param {React.FormEvent<HTMLInputElement>} event
     * @param {string} basePath
     */
    function handleBasePathChange(event: FormEvent<HTMLInputElement>, basePath: string = settings.basePath): void {
        setBasePathError(basePathErrorMessage(basePath))
        onChange({...settings, basePath})
    }

    return (
        <Stack>
            <TextField
                label="Hostname or IP Address:"
                onChange={handleHostChange}
                value={settings.host}
                errorMessage={hostError}
                styles={{errorMessage: {color: theme.palette.redDark}}}
                underlined
            />
            <TextField
                label="Port on which server listens:"
                onChange={handlePortChange}
                value={`${settings.port}`}
                errorMessage={portError}
                styles={{errorMessage: {color: theme.palette.redDark}}}
                underlined
            />
            <TextField
                label="Base path for REST calls:"
                onChange={handleBasePathChange}
                value={settings.basePath}
                errorMessage={basePathError}
                styles={{errorMessage: {color: theme.palette.redDark}}}
                underlined
            />
        </Stack>
    )
}
