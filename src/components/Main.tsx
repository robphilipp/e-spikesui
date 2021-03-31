import * as React from 'react'
import {useEffect} from 'react'
import {CommandBar, ContextualMenuItemType, ICommandBarItemProps, MessageBar, Stack, StackItem} from '@fluentui/react'
import {Palette} from "../theming";
import {connect} from 'react-redux';
import {AppState} from "./redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {hideSettingsPanel, showSettingsPanel} from "./redux/actions/settings";
import {ApplicationAction, FeedbackMessage} from "./redux/actions/actions";
import {HashMap, Option} from "prelude-ts";
import SettingsPanel from "./settings/SettingsPanel";
import {Route, RouteComponentProps, Switch, useHistory, useRouteMatch, withRouter} from 'react-router-dom';
import NetworkEditor from "./editors/NetworkEditor";
import {registerSpikesLanguage} from "./language/spikes-language";
import {
    loadNetworkDescriptionFrom,
    loadNetworkDescriptionFromTemplate,
    NetworkDescriptionLoadedAction,
    NetworkDescriptionSavedAction,
    saveNetworkDescription as persistNetworkDescription,
} from "./redux/actions/networkDescription";
import {remote} from "electron";
import SensorsEditor from './editors/SensorsEditor';
import {
    loadSensorsFrom,
    loadSensorsFromTemplate,
    saveSensors,
    SensorsLoadedAction,
    SensorsSavedAction
} from "./redux/actions/sensors";
import SimulationManager, {NEW_PROJECT_PATH} from "./simulation/SimulationManager";
import {
    loadSimulationProject,
    newSimulationProject,
    ProjectCreatedAction,
    ProjectLoadedAction,
    ProjectSavedAction,
    saveSimulationProject
} from "./redux/actions/simulationProject";
import {SimulationProject} from "./repos/simulationProjectRepo";
import LoadingModal from "./common/LoadingModal";
import LoadingProvider from './common/useLoading';
import {useTheme} from "./common/useTheme";
import {MessageProvider} from "./common/useMessage";
import ApplicationMessage from "./common/ApplicationMessage";

enum AppPath {
    NETWORK_EDITOR = '/network-editor',
    SENSOR_EDITOR = '/sensor-editor',
    SIMULATION = '/simulation'
}

interface OwnProps extends RouteComponentProps<never> {
    colorPalettes: HashMap<string, Palette>
}

interface StateProps {
    // // holds an error message
    // message: Option<FeedbackMessage>;

    // determines if the application settings panel is visible
    settingsPanelVisible: boolean;
    // network-description, path, template path, and modification state
    networkDescriptionTemplatePath: string;
    networkDescription: string;
    networkDescriptionPath: string;
    networkDescriptionModified: boolean;
    // sensor, path, template path, and modification state
    sensorDescriptionTemplatePath: string;
    sensorDescription: string;
    sensorDescriptionPath: string;
    sensorDescriptionModified: boolean;
    // simulation project
    simulationProjectPath: string;
    simulationProjectModified: boolean;
}

interface DispatchProps {
    // onSetErrorMessage: (message: JSX.Element) => void;
    // onClearMessage: () => void;

    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;

    onLoadNetworkDescriptionTemplate: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onLoadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onSaveNetworkDescription: (path: string, description: string) => Promise<NetworkDescriptionSavedAction>;

    onLoadSensorDescriptionTemplate: (path: string) => Promise<SensorsLoadedAction>;
    onLoadSensorDescription: (path: string) => Promise<SensorsLoadedAction>;
    onSaveSensorDescription: (path: string, codeSnippet: string) => Promise<SensorsSavedAction>;

    onCreateSimulationProject: () => ProjectCreatedAction;
    onLoadSimulationProject: (path: string) => Promise<ProjectLoadedAction>;
    onSaveSimulationProject: (path: string, project: SimulationProject) => Promise<ProjectSavedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

function Main(props: Props): JSX.Element {
    const {
        settingsPanelVisible,
        onShowSettingsPanel,
        onHideSettingsPanel,

        // message,
        // onSetErrorMessage,
        // onClearMessage,

        networkDescriptionTemplatePath,
        networkDescription,
        networkDescriptionModified,
        networkDescriptionPath,

        onLoadNetworkDescriptionTemplate,
        onLoadNetworkDescription,
        onSaveNetworkDescription,

        sensorDescriptionTemplatePath,
        sensorDescription,
        sensorDescriptionPath,
        sensorDescriptionModified,

        onLoadSensorDescriptionTemplate,
        onLoadSensorDescription,
        onSaveSensorDescription,

        simulationProjectPath,
        simulationProjectModified,
        onCreateSimulationProject,
        onLoadSimulationProject,
        onSaveSimulationProject,
    } = props;

    // react-router
    const history = useHistory();
    const networkEditorRouteMatch = useRouteMatch(AppPath.NETWORK_EDITOR);

    const {itheme} = useTheme()

    // register spikes language with the monaco editor when the component mounts
    useEffect(() => {
        registerSpikesLanguage();
    }, []);

    /**
     * Returns a list of menu items that start at the top-left of the page
     * @return The command bar menu items
     */
    function menuItems(): Array<ICommandBarItemProps> {
        return [
            {
                key: 'simulation',
                name: 'Simulation',
                cacheKey: 'simulation-cache-key',
                iconProps: {iconName: 'brain'},
                ariaLabel: 'Simulation',
                subMenuProps: {
                    items: [
                        {
                            key: 'editSimulation',
                            text: 'Edit',
                            iconProps: {iconName: 'brain'},
                            ariaLabel: 'Edit Network',
                            onClick: handleEditSimulationProject
                        },
                        {
                            key: 'divider_simulation_1',
                            itemType: ContextualMenuItemType.Divider
                        },
                        {
                            key: 'newSimulation',
                            text: 'New Simulation',
                            iconProps: {iconName: 'add'},
                            onClick: handleNewSimulationProject
                        },
                        {
                            key: 'loadSimulation',
                            text: 'Load Simulation',
                            iconProps: {iconName: 'upload'},
                            onClick: handleLoadSimulationProject
                        },
                    ],
                },
            },
            {
                key: 'network',
                name: 'Network',
                cacheKey: 'network-cache-key',
                iconProps: {iconName: 'homegroup'},
                ariaLabel: 'Network',
                subMenuProps: {
                    items: [
                        {
                            key: 'editNetwork',
                            text: 'Edit',
                            iconProps: {iconName: 'homegroup'},
                            ariaLabel: 'Edit Network',
                            onClick: handleEditNetwork
                        },
                        {
                            key: 'divider_1',
                            itemType: ContextualMenuItemType.Divider
                        },
                        {
                            key: 'newNetwork',
                            text: 'New',
                            iconProps: {iconName: 'add'},
                            ariaLabel: 'New Network',
                            onClick: handleNewNetwork
                        },
                        {
                            key: 'loadNetwork',
                            text: 'Load...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Load Network',
                            onClick: handleLoadNetworkDescription
                        },
                        {
                            key: 'saveNetwork',
                            text: 'Save',
                            iconProps: {iconName: 'save'},
                            ariaLabel: 'Save Network',
                            disabled: !networkDescriptionPath || !networkDescriptionModified || !networkEditorRouteMatch || networkDescriptionPath === networkDescriptionTemplatePath,
                            onClick: handleSaveNetworkDescription
                        },
                        {
                            key: 'saveNetworkAs',
                            text: 'Save As...',
                            ariaLabel: 'Save Network As',
                            iconProps: {iconName: 'save'},
                            disabled: !networkEditorRouteMatch,
                            onClick: handleSaveNetworkDescriptionAs
                        },
                    ],
                },
            },
            {
                key: 'sensor',
                name: 'Sensor',
                cacheKey: 'sensor-cache-key',
                iconProps: {iconName: 'environment'},
                subMenuProps: {
                    items: [
                        {
                            key: 'editSensor',
                            text: 'Edit',
                            iconProps: {iconName: 'environment'},
                            ariaLabel: 'Edit Network Sensor',
                            onClick: handleEditSensor,
                        },
                        {
                            key: 'divider_2',
                            itemType: ContextualMenuItemType.Divider
                        },
                        {
                            key: 'newSensor',
                            text: 'New',
                            iconProps: {iconName: 'add'},
                            ariaLabel: 'New Sensor',
                            onClick: handleNewSensor
                        },
                        {
                            key: 'loadSensor',
                            text: 'Load...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Load Network Sensor',
                            onClick: handleLoadSensor
                        },
                        {
                            key: 'saveSensor',
                            text: 'Save',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Save Network Sensor',
                            onClick: handleSaveSensor
                        },
                        {
                            key: 'saveSensorAs',
                            text: 'Save As...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Save Network Sensor As',
                            onClick: handleSaveSensorAs
                        },
                    ],
                },
            }
        ];
    }

    /**
     * Returns a list of menu items on the upper right-hand side of the menu bar. For example, returns the settings
     * menu item.
     * @param visibility Manages the settings panel visibility state
     * @return The menu item properties
     */
    function farMenuItems(visibility: (visible: boolean) => void): Array<ICommandBarItemProps> {
        const baseItems = [
            {
                key: 'settings',
                name: 'Settings',
                ariaLabel: 'Settings',
                iconProps: {
                    iconName: 'Settings'
                },
                iconOnly: true,
                onClick: () => visibility(true)
            },
            {
                key: 'help',
                name: 'Help',
                ariaLabel: 'Help',
                iconProps: {iconName: 'help'},
                iconOnly: true,
            }
        ];

        if (simulationProjectPath !== undefined && simulationProjectPath !== NEW_PROJECT_PATH) {
            baseItems.unshift({
                key: 'simulation',
                name: simulationProjectPath,
                ariaLabel: 'Simulation Project Editor',
                iconProps: {iconName: 'brain'},
                iconOnly: true,
                onClick: () => history.push(`${AppPath.SIMULATION}/${encodeURIComponent(simulationProjectPath)}`)
            })
        }

        return baseItems;
    }

    /**
     * Handles the visibility of the settings panel
     */
    function handleSettingsPanelVisibility(): void {
        settingsPanelVisible ? onHideSettingsPanel() : onShowSettingsPanel();
    }

    /**
     * Handles editing the currently loaded network
     */
    function handleEditNetwork(): void {
        history.push(`${AppPath.NETWORK_EDITOR}/${encodeURIComponent(networkDescriptionPath)}`);
    }

    /**
     * Handles the request to load a new network (from template) by routing the request, along with the
     * template file path to the network editor, which will load the network template and display the
     * new network.
     */
    function handleNewNetwork(): void {
        onLoadNetworkDescriptionTemplate(networkDescriptionTemplatePath)
            .then(() => history.push(`${AppPath.NETWORK_EDITOR}/${encodeURIComponent(networkDescriptionTemplatePath)}`));
    }

    /**
     * Handles the request to load an existing network by routing the request, along with the
     * network description file path to the network editor, which will load the network description
     * and display the it.
     */
    function handleLoadNetworkDescription(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-network', extensions: ['boo']}],
                    properties: ['openFile']
                })
            .then(response => {
                history.push(`${AppPath.NETWORK_EDITOR}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Handles saving the network description to the current network description path.
     * If the current network description path is undefined, then revert to the 'save-as'
     * dialog
     */
    function handleSaveNetworkDescription(): void {
        if (networkDescriptionPath !== networkDescriptionTemplatePath) {
            onSaveNetworkDescription(networkDescriptionPath, networkDescription)
                // todo add an alert
                .then(() => console.log('saved'));
        } else {
            handleSaveNetworkDescriptionAs();
        }
    }

    /**
     * Handles saving the network description file when the path is current set, or the user
     * would like to save the file to a new name.
     */
    function handleSaveNetworkDescriptionAs(): void {
        // TODO hold on to this for a bit; when enableRemoteModule is false, then must use
        //      IPC methods to open the dialog, etc
        // ipcRenderer.send('save-network-description');
        // ipcRenderer.once('save-network-description-path', (event, arg) => {
        //     console.log('file path');
        //     console.log(arg);
        // })
        remote.dialog
            .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
            .then(response => onSaveNetworkDescription(response.filePath, networkDescription)
                // todo handle the success and failure
                .then(() => history.push(`${AppPath.NETWORK_EDITOR}/${encodeURIComponent(response.filePath)}`))
            );
    }

    /**
     * Handles editing the currently loaded environment code-snippet
     */
    function handleEditSensor(): void {
        history.push(`${AppPath.SENSOR_EDITOR}/${encodeURIComponent(sensorDescriptionPath)}`)
    }

    /**
     * Handles the request to load a new environment (from template) by routing the request, along with the
     * template file path to the environment code-snippet editor, which will load the environment template and display the
     * new code snippet.
     */
    function handleNewSensor(): void {
        onLoadSensorDescriptionTemplate(sensorDescriptionTemplatePath)
            .then(() => history.push((`${AppPath.SENSOR_EDITOR}/${encodeURIComponent(sensorDescriptionTemplatePath)}`)));
    }

    /**
     * Handles the request to load an existing environment code-snippet by routing the request, along with the
     * environment code-snippet file path to the network editor, which will load the environment code-snippet
     * and display the it.
     */
    function handleLoadSensor(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-sensor', extensions: ['sensor']}],
                    properties: ['openFile']
                })
            .then(response => {
                history.push(`${AppPath.SENSOR_EDITOR}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Handles saving the environment code-snippet to the current environment path.
     * If the current environment code-snippet path is undefined, then revert to the 'save-as'
     * dialog
     */
    function handleSaveSensor(): void {
        if (sensorDescriptionPath !== sensorDescriptionTemplatePath) {
            onSaveSensorDescription(sensorDescriptionPath, sensorDescription)
                // todo add an alert
                .then(() => console.log('saved'));
        } else {
            handleSaveSensorAs();
        }
    }

    /**
     * Handles saving the environment code-snippet file when the path is current set, or the user
     * would like to save the file to a new name.
     */
    function handleSaveSensorAs(): void {
        remote.dialog
            .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
            .then(response => onSaveSensorDescription(response.filePath, sensorDescription)
                // todo handle the success and failure
                .then(() => history.push(`${AppPath.SENSOR_EDITOR}/${encodeURIComponent(response.filePath)}`))
            );

    }

    /**
     * Handles editing the currently loaded network
     */
    function handleEditSimulationProject(): void {
        history.push(`${AppPath.SIMULATION}/${encodeURIComponent(simulationProjectPath)}`);
    }

    /**
     * Handles creating a new simulation project
     */
    function handleNewSimulationProject(): void {
        onCreateSimulationProject();
        history.push(`${AppPath.SIMULATION}/${encodeURIComponent(NEW_PROJECT_PATH)}`);
    }

    /**
     * Handles the request to load an existing network by routing the request, along with the
     * network description file path to the network editor, which will load the network description
     * and display the it.
     */
    function handleLoadSimulationProject(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-project', extensions: ['spikes']}],
                    properties: ['openFile']
                })
            .then(response => {
                history.push(`${AppPath.SIMULATION}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    return (
        <LoadingProvider>
            <LoadingModal/>
            <MessageProvider>
            <Stack>
                <StackItem>
                    <CommandBar
                        items={menuItems()}
                        farItems={farMenuItems(handleSettingsPanelVisibility)}
                    />
                </StackItem>
                <StackItem>
                    <ApplicationMessage/>
                </StackItem>
                <StackItem grow>
                    <SettingsPanel/>
                </StackItem>
                <StackItem>
                    <Switch>
                        <Route
                            path={`${AppPath.SIMULATION}/:simulationProjectPath`}
                            render={(renderProps) =>
                                <SimulationManager
                                    networkRouterPath={AppPath.NETWORK_EDITOR}
                                    sensorRouterPath={AppPath.SENSOR_EDITOR}
                                    {...renderProps}
                                />
                            }
                        />
                        <Route
                            path={`${AppPath.NETWORK_EDITOR}/:networkPath`}
                            render={(renderProps) => <NetworkEditor {...renderProps}/>}
                        />
                        <Route
                            path={`${AppPath.SENSOR_EDITOR}/:sensorsPath`}
                            render={(renderProps) => <SensorsEditor {...renderProps}/>}
                        />
                    </Switch>
                </StackItem>
            </Stack>
            </MessageProvider>
        </LoadingProvider>
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
 * @param ownProps The current properties of the `App` component
 * @return the state props for this component
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    // message: state.application.message,
    settingsPanelVisible: state.application.settingsPanelVisible,

    networkDescriptionTemplatePath: state.settings.networkDescription.templatePath,
    networkDescription: state.networkDescription.description,
    networkDescriptionPath: state.networkDescription.path,
    networkDescriptionModified: state.networkDescription.modified,

    sensorDescriptionTemplatePath: state.settings.sensorDescription.templatePath,
    sensorDescription: state.sensorDescription.codeSnippet,
    sensorDescriptionPath: state.sensorDescription.path,
    sensorDescriptionModified: state.sensorDescription.modified,

    simulationProjectPath: state.simulationProject.projectPath,
    simulationProjectModified: state.simulationProject.modified
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    // onSetErrorMessage: (message: JSX.Element) => dispatch(setErrorMessage(message)),
    // onClearMessage: () => dispatch(clearMessage()),

    onShowSettingsPanel: () => dispatch(showSettingsPanel()),
    onHideSettingsPanel: () => dispatch(hideSettingsPanel()),

    onLoadNetworkDescriptionTemplate: (path: string) => dispatch(loadNetworkDescriptionFromTemplate(path)),
    onLoadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    onSaveNetworkDescription: (path: string, description: string) => dispatch(persistNetworkDescription(path, description)),

    onLoadSensorDescriptionTemplate: (path: string) => dispatch(loadSensorsFromTemplate(path)),
    onLoadSensorDescription: (path: string) => dispatch(loadSensorsFrom(path)),
    onSaveSensorDescription: (path: string, codeSnippet: string) => dispatch(saveSensors(path, codeSnippet)),

    onCreateSimulationProject: () => dispatch(newSimulationProject()),
    onLoadSimulationProject: (path: string) => dispatch(loadSimulationProject(path)),
    onSaveSimulationProject: (path: string, project: SimulationProject) => dispatch(saveSimulationProject(path, project)),
});

const connectedApp = connect(mapStateToProps, mapDispatchToProps)(Main)

export default withRouter(connectedApp)
