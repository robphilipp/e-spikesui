import * as React from 'react';
import {Card} from "@uifabric/react-cards";
import {Icon, IconButton, ITheme, SpinButton, Text, TextField} from "@fluentui/react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction, MessageSetAction, setErrorMessage, setSuccessMessage} from "../redux/actions/actions";
import {updateSimulationProject} from "../redux/actions/simulationProject";
import {SimulationProject} from "../repos/simulationProjectRepo";
import {loadSensorsFrom, SensorsLoadedAction} from "../redux/actions/sensors";
import {loadNetworkDescriptionFrom, NetworkDescriptionLoadedAction} from "../redux/actions/networkDescription";
import {connect} from "react-redux";
import {NEW_NETWORK_PATH} from "../editors/NetworkEditor";
import {NEW_SENSOR_PATH} from "../editors/SensorsEditor";
import {RouteComponentProps, useHistory, withRouter} from "react-router-dom";
import {remote} from "electron";
import {useLoading} from "../common/useLoading";

const durationRegex = /^[0-9]+[ ]*s*$/
const MIN_TIME_FACTOR = 1;
const MAX_TIME_FACTOR = 20;

interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;
    networkRouterPath: string;
    sensorRouterPath: string;
}

interface StateProps {
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;
    networkDescriptionPath?: string;
    sensorDescriptionPath?: string;
    modified: boolean;
}

interface DispatchProps {
    onChange: (project: SimulationProject) => void;

    onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    onLoadNetwork: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onSetError: (messages: JSX.Element) => MessageSetAction;
    onSetSuccess: (messages: JSX.Element) => MessageSetAction;
}

type Props = OwnProps & StateProps & DispatchProps;

function ProjectConfig(props: Props): JSX.Element {
    const {
        itheme,
        networkRouterPath,
        sensorRouterPath,
        simulationName,
        timeFactor,
        simulationDuration,
        networkDescriptionPath,
        sensorDescriptionPath,
        onChange,
        onLoadSensor,
        onLoadNetwork,
        onSetError,
    } = props;

    const history = useHistory();
    const {updateLoadingState} = useLoading();

    /**
     * Handles changes to the simulation name
     * @param name The new name of the simulation
     */
    function handleSimulationNameChange(name: string): void {
        onChange({
            simulationName: name,
            timeFactor,
            simulationDuration,
            sensorFilePath: sensorDescriptionPath,
            networkFilePath: networkDescriptionPath
        })
    }

    /**
     * Handles changes to the simulation time-factor
     * @param factor The new time factor
     */
    function handleTimeFactorChange(factor: number): void {
        const newTimeFactor = Math.max(MIN_TIME_FACTOR, Math.min(MAX_TIME_FACTOR, factor));
        if (newTimeFactor !== timeFactor) {
            onChange({
                simulationName,
                timeFactor: newTimeFactor,
                simulationDuration,
                sensorFilePath: sensorDescriptionPath,
                networkFilePath: networkDescriptionPath
            })
        }
    }

    /**
     * Handles validating the simulation time factor
     * @param value The new time factor (should be a number in the interval [1, 20])
     */
    function handleValidateTimeFactor(value: string): string {
        const timeFactor = Math.max(MIN_TIME_FACTOR, Math.min(MAX_TIME_FACTOR, parseInt(value)));
        return timeFactor.toString();
    }

    /**
     * Handles changes to the duration of the simulation
     * @param duration The duration of the simulation in seconds
     */
    function handleSimulationTimeChange(duration: number): void {
        if (duration >= 1) {
            onChange({
                simulationName,
                timeFactor,
                simulationDuration: duration,
                sensorFilePath: sensorDescriptionPath,
                networkFilePath: networkDescriptionPath
            })
        }
    }

    /**
     * Updates the simulation duration by the specified amount
     * @param value The current duration (as a string from the text field)
     * @param amount The amount to add to the current duration
     */
    function updateSimulationTime(value: string, amount: number): void {
        if (value.match(durationRegex) !== null) {
            const duration = parseInt(value.split(' ')[0]);
            if (!isNaN(duration)) {
                handleSimulationTimeChange(Math.floor(Math.max(1, duration + amount)));
            }
        }
    }

    /**
     * Handles editing the network description, if specified, or a new network description, otherwise.
     */
    function handleEditNetworkDescription(): void {
        // when the sensor-description file path exists and isn't too short, then edit that file,
        // otherwise, let edit a new file from the template
        if (networkDescriptionPath && networkDescriptionPath.length > 2) {
            history.push(`${networkRouterPath}/${encodeURIComponent(networkDescriptionPath)}`);
        } else {
            history.push(`${networkRouterPath}/${encodeURIComponent(NEW_NETWORK_PATH)}`);
        }
    }

    /**
     * Handles editing the sensor description, if specified, or a new sensor description, otherwise.
     */
    function handleEditSensorDescription(): void {
        // when the sensor-description file path exists and isn't too short, then edit that file,
        // otherwise, let edit a new file from the template
        if (sensorDescriptionPath && sensorDescriptionPath.length > 2) {
            history.push(`${sensorRouterPath}/${encodeURIComponent(sensorDescriptionPath)}`);
        } else {
            history.push(`${sensorRouterPath}/${encodeURIComponent(NEW_SENSOR_PATH)}`);
        }
    }

    /**
     * Handles loading the sensor description from file
     */
    function handleLoadSensor(): void {
        updateLoadingState(true, "Loading sensor file")
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-sensor', extensions: ['sensor']}],
                    properties: ['openFile']
                })
            .then(response => {
                if (response.filePaths.length === 0) {
                    updateLoadingState(false);
                    return;
                }
                onLoadSensor(response.filePaths[0])
                    .then(action => onChange({
                        simulationName,
                        timeFactor,
                        simulationDuration,
                        networkFilePath: networkDescriptionPath,
                        sensorFilePath: action.result.path,
                    }))
                    .catch(reason => onSetError(<>
                        <div><b>Unable to load sensor-description file</b></div>
                        <div>Path: {response.filePaths[0]}</div>
                        <div>Response: {reason}</div>
                    </>))
                    .finally(() => updateLoadingState(false));
            })
    }

    /**
     * Handle loading a network description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadNetwork(): void {
        updateLoadingState(true, "Loading network description file");
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-network', extensions: ['boo']}],
                    properties: ['openFile']
                })
            .then(response => {
                if (response.filePaths.length === 0) {
                    updateLoadingState(false)
                    return;
                }
                onLoadNetwork(response.filePaths[0])
                    .then(action => onChange({
                        simulationName,
                        timeFactor,
                        simulationDuration,
                        networkFilePath: action.result.path,
                        sensorFilePath: sensorDescriptionPath,
                    }))
                    .catch(reason => onSetError(<>
                        <div><b>Unable to load network-description file</b></div>
                        <div>Path: {response.filePaths[0]}</div>
                        <div>Response: {reason}</div>
                    </>))
                    .finally(() => updateLoadingState(false));
            })
    }
    /**
     * @return A card showing the sensor-description file with a button to select a different file or to
     * edit the existing file.
     */
    function simulationCard(): JSX.Element {
        return (
            <Card
                aria-label="Simulation Parameters"
                horizontal tokens={{childrenMargin: 12, boxShadow: "none"}}
            >
                <Card.Item align="start" tokens={{margin: 20}}>
                    <Icon
                        iconName='sprint'
                        style={{color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16}}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{color: itheme.palette.themePrimary, fontWeight: 700}}
                    >
                        Simulation Parameters
                    </Text>
                    <TextField
                        label="Simulation Name"
                        placeholder="description name"
                        onChange={(event, name) => handleSimulationNameChange(name)}
                        value={simulationName}
                        autoFocus
                        styles={{errorMessage: {color: itheme.palette.redDark}}}
                    />
                    <SpinButton
                        label="Time Factor"
                        min={1}
                        max={20}
                        value={`${timeFactor}`}
                        onValidate={handleValidateTimeFactor}
                        incrementButtonIcon={{iconName: 'chevronup'}}
                        decrementButtonIcon={{iconName: 'chevrondown'}}
                        onIncrement={(value: string) => handleTimeFactorChange(parseInt(value) + 1)}
                        onDecrement={(value: string) => handleTimeFactorChange(parseInt(value) - 1)}
                        onBlur={event => handleTimeFactorChange(parseInt(event.currentTarget.value))}
                    />
                    <Text
                        variant="small"
                        style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                    >
                        How many seconds in real time does it take to simulate 1 second?
                    </Text>
                    <SpinButton
                        label="Simulation Duration"
                        min={1}
                        max={20000}
                        value={`${simulationDuration} s`}
                        incrementButtonIcon={{iconName: 'chevronup'}}
                        decrementButtonIcon={{iconName: 'chevrondown'}}
                        onIncrement={(value: string) => updateSimulationTime(value, 10)}
                        onDecrement={(value: string) => updateSimulationTime(value, -10)}
                        onBlur={event => updateSimulationTime(event.currentTarget.value, 0)}
                    />
                    <Text
                        variant="small"
                        style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                    >
                        Simulation duration in simulation time.
                    </Text>
                </Card.Section>
            </Card>
        )
    }

    /**
     * @return Card showing the network-description file with buttons to select a new file or edit the current file
     */
    function networkDescriptionCard(): JSX.Element {
        return (
            <Card aria-label="Network Description File" horizontal tokens={{childrenMargin: 12, boxShadow: "none"}}>
                <Card.Item align="start" tokens={{margin: 20}}>
                    <Icon
                        iconName='homegroup'
                        style={{color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16}}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{color: itheme.palette.themePrimary, fontWeight: 700}}
                    >
                        Network Description
                    </Text>
                    <Text
                        variant="medium"
                        style={{color: itheme.palette.neutralPrimary, fontWeight: 400}}
                    >
                        {networkDescriptionPath || '(none selected'}
                    </Text>
                    <Text
                        variant="small"
                        style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                    >
                        Select or edit a network description file
                    </Text>
                </Card.Section>
                <Card.Section
                    styles={{root: {alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}`}}}
                    tokens={{padding: '0px 0px 0px 12px'}}>
                    <IconButton
                        iconProps={{iconName: "edit"}}
                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                        onClick={handleEditNetworkDescription}
                    />
                    <IconButton
                        iconProps={{iconName: "file"}}
                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                        onClick={handleLoadNetwork}
                    />
                </Card.Section>
            </Card>
        )
    }

    /**
     * @return A card showing the sensor-description file with a button to select a different file or to
     * edit the existing file.
     */
    function sensorDescriptionCard(): JSX.Element {
        return (
            <Card aria-label="Network Description File" horizontal tokens={{childrenMargin: 12, boxShadow: "none"}}>
                <Card.Item align="start" tokens={{margin: 20}}>
                    <Icon
                        iconName='environment'
                        style={{color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16}}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{color: itheme.palette.themePrimary, fontWeight: 700}}
                    >
                        Sensor Description
                    </Text>
                    <Text
                        variant="medium"
                        style={{color: itheme.palette.neutralPrimary, fontWeight: 400}}
                    >
                        {sensorDescriptionPath || '(none selected'}
                    </Text>
                    <Text
                        variant="small"
                        style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                    >
                        Select or edit a sensor description file
                    </Text>
                </Card.Section>
                <Card.Section
                    styles={{root: {alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}`}}}
                    tokens={{padding: '0px 0px 0px 12px'}}
                >
                    <IconButton
                        iconProps={{iconName: "edit"}}
                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                        onClick={handleEditSensorDescription}
                    />
                    <IconButton
                        iconProps={{iconName: "file"}}
                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                        onClick={handleLoadSensor}
                    />
                </Card.Section>
            </Card>
        )
    }

    return (
        <>
            {simulationCard()}
            {networkDescriptionCard()}
            {sensorDescriptionCard()}
        </>
    );
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
 */
const mapStateToProps = (state: AppState): StateProps => ({
    simulationName: state.simulationProject.name,
    timeFactor: state.simulationProject.timeFactor,
    simulationDuration: state.simulationProject.simulationDuration,
    networkDescriptionPath: state.simulationProject.networkDescriptionPath,
    sensorDescriptionPath: state.simulationProject.sensorDescriptionPath,
    modified: state.simulationProject.modified,
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onChange: (project: SimulationProject) => dispatch(updateSimulationProject(project)),
    onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    onLoadNetwork: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),

    onSetError: (messages: JSX.Element) => dispatch(setErrorMessage(messages)),
    onSetSuccess: (messages: JSX.Element) => dispatch(setSuccessMessage(messages)),
});

const connectedProjectConfig = connect(mapStateToProps, mapDispatchToProps)(ProjectConfig);
export default withRouter(connectedProjectConfig);
