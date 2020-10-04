import * as React from 'react';
import ServerSettings from "./serverSettings";
import {ITheme, Stack, TextField } from '@fluentui/react';
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {changeServerSettings} from "../redux/actions/settings";
import {connect} from "react-redux";
import {useCallback, useState} from "react";

interface StateProps {
    serverSettings: ServerSettings;
}

interface DispatchProps {
    onChangeServerSettings: (settings: ServerSettings) => void;
}

type Props = StateProps & DispatchProps

const hostnameRegex = /^[a-zA-Z0-9_-]+[a-zA-Z0-9_\-\\.]*$/
const ip4Regex = /^[0-9_-]{1,3}(.[0-9]{1,3}){3}$/

function ServerSettingsEditor(props: Props): JSX.Element {
    const [host, setHost] = useState<string>(props.serverSettings.host);
    const [port, setPort] = useState<number>(props.serverSettings.port);
    const [basePath, setBasePath] = useState<string>(props.serverSettings.basePath);

    const [hostError, setHostError] = useState<string>();

    const onHostChange = useCallback(
        (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newHost?: string) => {
            // if (newHost) {
            //     props.onChangeServerSettings(({...props.serverSettings, host: newHost}));
            // }
            if (newHost === undefined || (newHost.match(hostnameRegex) === null && newHost.match(ip4Regex) === null)) {
                setHostError("Invalid hostname or IP address")
            } else {
                setHostError('')
            }
            setHost(newHost)
            // }
        },
        [],

    )

    return (
        <Stack>
            <TextField
                label="Hostname or IP Address:"
                onChange={onHostChange}
                value={host}
                errorMessage={hostError}
                underlined
            />
            <TextField
                label="Port on which server listens:"
                value={`${port}`}
                underlined
            />
            <TextField
                label="Base URL:"
                value={basePath}
                underlined
            />
        </Stack>
    )
}

/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions.ts for the action types)
 |
 */

/**
 * react-redux function that maps the application state to the props used by the `App` component.
 * @param state The updated application state
 * @return The state properties
 */
function mapStateToProps(state: AppState): StateProps {
    return {
        serverSettings: state.settings.server
    }
}

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
function mapDispatchToProps(dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps {
    return {
        onChangeServerSettings: (settings: ServerSettings) => dispatch(changeServerSettings(settings))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(ServerSettingsEditor)