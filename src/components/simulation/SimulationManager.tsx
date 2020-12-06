import * as React from "react";
import { AppState } from "../redux/reducers/root";
import { ThunkDispatch } from "redux-thunk";
import { ApplicationAction, clearErrorMessages, ErrorMessageClearedAction, ErrorMessageSetAction, setErrorMessages } from "../redux/actions/actions";
import { connect } from "react-redux";
import { RouteComponentProps, useHistory, useParams, useRouteMatch, withRouter } from "react-router-dom";
import { SimulationProject } from "../repos/simulationProjectRepo";
import {
    loadSimulationProject, newSimulationProject, ProjectLoadedAction, ProjectSavedAction, ProjectUpdatedAction,
    saveSimulationProject, SimulationProjectResult,
    updateSimulationProject
} from "../redux/actions/simulationProject";
import {
    ActionButton,
    DefaultButton,
    FontWeights,
    Icon,
    IconButton,
    IIconStyles,
    IStackTokens,
    ITextStyles,
    ITheme,
    Link,
    MessageBar,
    MessageBarType,
    PrimaryButton,
    Separator,
    SpinButton,
    Stack,
    StackItem,
    Text,
    TextField,
    TooltipHost
} from "@fluentui/react";
import { Card } from '@uifabric/react-cards';
import { DefaultTheme } from "../editors/themes";
import { remote } from "electron";
import { useEffect, useRef, useState } from "react";
import { loadSensorsFrom, SensorsLoadedAction } from "../redux/actions/sensors";
import { NEW_SENSOR_PATH } from "../editors/SensorsEditor";
import { NEW_NETWORK_PATH } from "../editors/NetworkEditor";
import { loadNetworkDescriptionFrom, NetworkDescriptionLoadedAction } from "../redux/actions/networkDescription";
import { baseRouterPathFrom } from "../router/router";
import { KeyboardShortcut, keyboardShortcutFor } from "../editors/keyboardShortcuts";

export const NEW_PROJECT_PATH = '**new**';
const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

const durationRegex = /^[0-9]+[ ]*s*$/
const MIN_TIME_FACTOR = 1;
const MAX_TIME_FACTOR = 20;

interface OwnProps extends RouteComponentProps<never> {
    networkRouterPath: string;
    sensorRouterPath: string;
    itheme: ITheme;
    theme?: string;
}

interface StateProps {
    projectPath?: string;
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;
    networkDescriptionPath?: string;
    sensorDescriptionPath?: string;
    modified: boolean;
}

interface DispatchProps {
    onCreate: () => void;
    onLoad: (path: string) => Promise<ProjectLoadedAction>;
    onChange: (project: SimulationProject) => void;
    onSave: (path: string, project: SimulationProject) => Promise<ProjectSavedAction>;

    onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    onLoadNetwork: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    // onSetError: (messages: Array<string>) => ErrorMessageSetAction;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Manages the project settings and the simulation. The project settings included the network
 * description, the sensor description, the simulation name, time-factor, and duration.
 * @param props The props from the parent and redux
 * @return The simulation project editor and manager
 */
function SimulationManager(props: Props): JSX.Element {
    const {
        theme = DefaultTheme.DARK,
        itheme,
        networkRouterPath,
        sensorRouterPath,
        projectPath,
        simulationName,
        timeFactor,
        simulationDuration,
        networkDescriptionPath,
        sensorDescriptionPath,
        modified,
        onCreate,
        onLoad,
        onChange,
        onSave,
        onLoadSensor,
        onLoadNetwork,
        // onSetError,
    } = props;

    // when user refreshes when the router path is this simulation manager, then we want to load the same
    // project as before the refresh. to do this we use the path parameter holding the file path
    // to the project, and keep it consistent when loading a project
    const { simulationProjectPath } = useParams<{ [key: string]: string }>();
    const history = useHistory();
    const { path } = useRouteMatch();

    const [message, setMessage] = useState<JSX.Element>();
    const [baseRouterPath, setBaseRouterPath] = useState<string>(baseRouterPathFrom(path));

    // when the environment code-snippet file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the environment code-snippet,
    // or a template
    useEffect(
        () => {
            const filePath = decodeURIComponent(simulationProjectPath);
            if (filePath !== 'undefined' && filePath !== NEW_PROJECT_PATH && !modified) {
                onLoad(filePath)
                    .then(() => console.log("loaded"))
                    .catch(reason => setMessage(errorMessage(<div>{reason.message}</div>)))
            }
        },
        [simulationProjectPath]
    );

    // when the path changes, we need to recalculate the base router path, even though
    // that really shouldn't change
    useEffect(
        () => {
            setBaseRouterPath(baseRouterPathFrom(path));
        },
        [path]
    )

    /**
     * Handles creating a new project with default settings.
     */
    function handleNewProject(): void {
        onCreate();
        history.push(`${baseRouterPath}/${encodeURIComponent(NEW_PROJECT_PATH)}`);
    }

    /**
     * Handles loading the sensor description from file
     */
    function handleLoadSensor(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-sensor', extensions: ['sensor'] }],
                    properties: ['openFile']
                })
            .then(response => {
                onLoadSensor(response.filePaths[0])
                    .then(action => onChange({
                        simulationName,
                        timeFactor,
                        simulationDuration,
                        networkFilePath: networkDescriptionPath,
                        sensorFilePath: action.result.path,
                    }))
                    .catch(reason => setMessage(errorMessage(<>
                        <div><b>Unable to load sensor file</b></div>
                        <div>Path: {response.filePaths[0]}</div>
                        <div>Response: {reason}</div>
                    </>)));
            })
    }

    /**
     * Handle loading a network description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadNetwork(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-network', extensions: ['boo'] }],
                    properties: ['openFile']
                })
            .then(response => {
                onLoadNetwork(response.filePaths[0])
                    .then(action => onChange({
                        simulationName,
                        timeFactor,
                        simulationDuration,
                        networkFilePath: action.result.path,
                        sensorFilePath: sensorDescriptionPath,
                    }))
                    .catch(reason => setMessage(errorMessage(<div>{reason}</div>)));
            })
    }

    /**
     * Handle loading a sensor description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadProject(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-sensor', extensions: ['spikes'] }],
                    properties: ['openFile']
                })
            .then(response => {
                history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
            .catch(reason => setMessage(errorMessage(<div>{reason}</div>)));
        }

    /**
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     */
    function handleSaveProject(): void {
        const project: SimulationProject = {
            simulationName: simulationName,
            timeFactor: timeFactor,
            simulationDuration: simulationDuration,
            sensorFilePath: sensorDescriptionPath,
            networkFilePath: networkDescriptionPath
        }

        // if the state path is set and the path does not equal the template path, then the network
        // description is from an existing file, and we can just save it. otherwise, we need to up a
        // dialog so that the user can give the filename
        if (projectPath && projectPath !== NEW_PROJECT_PATH) {
            // todo handle success and error
            onSave(projectPath, project)
                .then(() => console.log('saved'))
                .catch(reason => setMessage(errorMessage(<div>{reason}</div>)));
            } else {
            remote.dialog
                .showSaveDialog(remote.getCurrentWindow(), { title: "Save As..." })
                .then(response => onSave(response.filePath, project)
                    .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(response.filePath)}`))
                    .catch(reason => setMessage(errorMessage(<div>{reason}</div>)))
                );
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
     * Handles keyboard events when the editor is focused
     * @param event The keyboard event
     */
    function handleKeyboardShortcut(event: React.KeyboardEvent<HTMLDivElement>): void {
        keyboardShortcutFor(event.nativeEvent).ifSome(shortcut => {
            switch (shortcut) {
                case KeyboardShortcut.NEW:
                    handleNewProject();
                    break;

                case KeyboardShortcut.SAVE: {
                    // const {path, templatePath, codeSnippet} = keyboardEventRef.current;
                    handleSaveProject();
                    break;
                }

                case KeyboardShortcut.LOAD:
                    handleLoadProject();
                    break;

                default:
                /* nothing to do */
            }
        });
    }

    /**
     * Create a button to create a new network
     * @return a button to create a new network
     */
    function newButton(): JSX.Element {
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="New simulation project">
                <IconButton
                    iconProps={{ iconName: 'add' }}
                    onClick={handleNewProject}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Creates a save button in the gutter when the contents have an associated file
     * path, and when they can be saved.
     * @return The save-button component
     */
    function saveButton(): JSX.Element {
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="Save simulation project">
                <IconButton
                    iconProps={{ iconName: 'save' }}
                    onClick={handleSaveProject}
                    disabled={!canSave()}
                />
            </TooltipHost>
        </div>
    }

    /**
     * @return `true` if the simulation project can be saved; `false` otherwise
     */
    function canSave(): boolean {
        const validProject = networkDescriptionPath !== undefined &&
            sensorDescriptionPath != undefined &&
            simulationDuration > 0 &&
            timeFactor >= 1;
        return validProject && (modified || projectPath === NEW_PROJECT_PATH);
    }

    /**
     * Presents the user with a open-file dialog for selecting a network description
     * file.
     * @return The load button for the sidebar
     */
    function loadButton(): JSX.Element {
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="Load network environment">
                <IconButton
                    iconProps={{ iconName: 'upload' }}
                    onClick={handleLoadProject}
                />
            </TooltipHost>
        </div>
    }

    /**
     * @return A card showing the sensor-description file with a button to select a different file or to
     * edit the existing file.
     */
    function simulationCard(): JSX.Element {
        return (
            <Card
                aria-label="Simulation Parameters"
                horizontal tokens={{ childrenMargin: 12, boxShadow: "none" }}
            >
                <Card.Item align="start" tokens={{ margin: 20 }}>
                    <Icon
                        iconName='sprint'
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16 }}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{ color: itheme.palette.themePrimary, fontWeight: 700 }}
                    >
                        Simulation Parameters
                    </Text>
                    <TextField
                        label="Simulation Name"
                        placeholder="description name"
                        onChange={(event, name) => handleSimulationNameChange(name)}
                        value={simulationName}
                        autoFocus
                        styles={{ errorMessage: { color: itheme.palette.redDark } }}
                    />
                    <SpinButton
                        label="Time Factor"
                        min={1}
                        max={20}
                        value={`${timeFactor}`}
                        onValidate={handleValidateTimeFactor}
                        incrementButtonIcon={{ iconName: 'chevronup' }}
                        decrementButtonIcon={{ iconName: 'chevrondown' }}
                        onIncrement={(value: string) => handleTimeFactorChange(parseInt(value) + 1)}
                        onDecrement={(value: string) => handleTimeFactorChange(parseInt(value) - 1)}
                        onBlur={event => handleTimeFactorChange(parseInt(event.currentTarget.value))}
                    />
                    <Text
                        variant="small"
                        style={{ color: itheme.palette.themeSecondary, fontWeight: 400 }}
                    >
                        How many seconds in real time does it take to simulate 1 second?
                    </Text>
                    <SpinButton
                        label="Simulation Duration"
                        min={1}
                        max={20000}
                        value={`${simulationDuration} s`}
                        incrementButtonIcon={{ iconName: 'chevronup' }}
                        decrementButtonIcon={{ iconName: 'chevrondown' }}
                        onIncrement={(value: string) => updateSimulationTime(value, 10)}
                        onDecrement={(value: string) => updateSimulationTime(value, -10)}
                        onBlur={event => updateSimulationTime(event.currentTarget.value, 0)}
                    />
                    <Text
                        variant="small"
                        style={{ color: itheme.palette.themeSecondary, fontWeight: 400 }}
                    >
                        Simulation duration in simulation time.
                    </Text>
                </Card.Section>
                {/* <Card.Section
                    styles={{ root: { alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}` } }}
                    tokens={{ padding: '0px 0px 0px 12px' }}
                >
                    <IconButton
                        iconProps={{ iconName: "sync" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
                        onClick={handleEditSensorDescription}
                    />
                    <IconButton
                        iconProps={{ iconName: "file" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
                        onClick={handleLoadSensor}
                    />
                </Card.Section> */}
            </Card>
        )
    }
    /**
     * @return Card showing the network-description file with buttons to select a new file or edit the current file
     */
    function networkDescriptionCard(): JSX.Element {
        return (
            <Card aria-label="Network Description File" horizontal tokens={{ childrenMargin: 12, boxShadow: "none" }}>
                <Card.Item align="start" tokens={{ margin: 20 }}>
                    <Icon
                        iconName='homegroup'
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16 }}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{ color: itheme.palette.themePrimary, fontWeight: 700 }}
                    >
                        Network Description
                </Text>
                    <Text
                        variant="medium"
                        style={{ color: itheme.palette.neutralPrimary, fontWeight: 400 }}
                    >
                        {networkDescriptionPath || '(none selected'}
                    </Text>
                    <Text
                        variant="small"
                        style={{ color: itheme.palette.themeSecondary, fontWeight: 400 }}
                    >
                        Select or edit a network description file
                </Text>
                </Card.Section>
                <Card.Section styles={{ root: { alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}` } }} tokens={{ padding: '0px 0px 0px 12px' }}>
                    <IconButton
                        iconProps={{ iconName: "edit" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
                        onClick={handleEditNetworkDescription}
                    />
                    <IconButton
                        iconProps={{ iconName: "file" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
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
            <Card aria-label="Network Description File" horizontal tokens={{ childrenMargin: 12, boxShadow: "none" }}>
                <Card.Item align="start" tokens={{ margin: 20 }}>
                    <Icon
                        iconName='environment'
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16 }}
                    />
                </Card.Item>
                <Card.Section grow>
                    <Text
                        variant="medium"
                        style={{ color: itheme.palette.themePrimary, fontWeight: 700 }}
                    >
                        Sensor Description
                </Text>
                    <Text
                        variant="medium"
                        style={{ color: itheme.palette.neutralPrimary, fontWeight: 400 }}
                    >
                        {sensorDescriptionPath || '(none selected'}
                    </Text>
                    <Text
                        variant="small"
                        style={{ color: itheme.palette.themeSecondary, fontWeight: 400 }}
                    >
                        Select or edit a sensor description file
                </Text>
                </Card.Section>
                <Card.Section
                    styles={{ root: { alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}` } }}
                    tokens={{ padding: '0px 0px 0px 12px' }}
                >
                    <IconButton
                        iconProps={{ iconName: "edit" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
                        onClick={handleEditSensorDescription}
                    />
                    <IconButton
                        iconProps={{ iconName: "file" }}
                        style={{ color: itheme.palette.themePrimary, fontWeight: 400 }}
                        onClick={handleLoadSensor}
                    />
                </Card.Section>
            </Card>
        )
    }

    /**
     * Message bar for displaying errors
     * @param message The error message
     * @return A `MessageBar` with an error message
     */
    function errorMessage(content: JSX.Element): JSX.Element {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                isMultiline={true}
                onDismiss={() => setMessage(undefined)}
                dismissButtonAriaLabel="Close"
            >
                {content}
            </MessageBar>
        )
    }
    // function errorMessage(message: Array<string>): JSX.Element {
    //     return (
    //         <MessageBar
    //             messageBarType={MessageBarType.error}
    //             isMultiline={true}
    //             onDismiss={() => setMessage(undefined)}
    //             dismissButtonAriaLabel="Close"
    //         >
    //             {message.map(line => (<div>{line}</div>))}
    //         </MessageBar>
    //     )
    // }

    return (
        <div
            onKeyDown={handleKeyboardShortcut}
        >
            {message || <span />}
            <div
                style={{
                    marginLeft: 30,
                    marginBottom: 8,
                    height: 15,
                    color: props.itheme.palette.themeSecondary
                }}
            >
                {projectPath === undefined || projectPath === NEW_PROJECT_PATH ? '[new file]' : projectPath}{modified ? '*' : ''}
            </div>
            <div>
                <Stack horizontal>
                    <StackItem>
                        {newButton()}
                        {saveButton()}
                        {loadButton()}
                        <Separator />
                        {/*{compileButton()}*/}
                        {/*{runSensorSimulationButton()}*/}
                        {/*{stopSensorSimulationButton()}*/}
                        {/*{showSimulation && hideSimulationButton()}*/}
                    </StackItem>
                    <Stack tokens={{ childrenGap: 10, padding: 20 }} grow>
                        {simulationCard()}
                        {networkDescriptionCard()}
                        {sensorDescriptionCard()}
                    </Stack>
                </Stack>
            </div>
        </div>
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
    projectPath: state.simulationProject.projectPath,
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
    onCreate: () => dispatch(newSimulationProject()),
    onChange: (project: SimulationProject) => dispatch(updateSimulationProject(project)),
    onLoad: (path: string) => dispatch(loadSimulationProject(path)),
    onSave: (path: string, project: SimulationProject) => dispatch(saveSimulationProject(path, project)),

    onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    onLoadNetwork: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),

    // onSetError: (messages: Array<string>) => dispatch(setErrorMessages(messages)),
});

const connectedSimulationManager = connect(mapStateToProps, mapDispatchToProps)(SimulationManager);
export default withRouter(connectedSimulationManager);