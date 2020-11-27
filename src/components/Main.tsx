import * as React from 'react'
import {useEffect} from 'react'
import {
    CommandBar,
    ContextualMenuItemType,
    ICommandBarItemProps,
    ITheme,
    MessageBar,
    MessageBarType,
    Stack,
    StackItem
} from '@fluentui/react'
import {Palette} from "../theming";
import {connect} from 'react-redux';
import {AppState} from "./redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {changeTheme, hideSettingsPanel, showSettingsPanel} from "./redux/actions/settings";
import {ApplicationAction, clearErrorMessages} from "./redux/actions/actions";
import {HashMap, Option} from "prelude-ts";
import SettingsPanel from "./settings/SettingsPanel";
import {Route, RouteComponentProps, Switch, useHistory, useRouteMatch, withRouter} from 'react-router-dom';
import NetworkEditor, {editorThemeFrom} from "./editors/NetworkEditor";
import {registerSpikesLanguage} from "./language/spikes-language";
import {
    loadNetworkDescriptionFromTemplate,
    loadNetworkDescriptionFrom,
    saveNetworkDescription as persistNetworkDescription,
    NetworkDescriptionLoadedAction,
    NetworkDescriptionSavedAction,
} from "./redux/actions/networkDescription";
import {remote} from "electron";
import SensorsEditor from './editors/SensorsEditor';
import {
    SensorsAction,
    SensorsLoadedAction,
    SensorsSavedAction, loadSensorsFrom,
    loadSensorsFromTemplate, saveSensors
} from "./redux/actions/sensors";
import SimulationManager from "./simulation/SimulationManager";

enum AppPath {
    NETWORK_EDITOR = '/network-editor',
    SENSOR_EDITOR = '/sensor-editor',
    SIMULATION = '/simulation'
}

interface OwnProps extends RouteComponentProps<never> {
    colorPalettes: HashMap<string, Palette>
}

interface StateProps {
    // holds an error message
    errorMessages: Option<string[]>;

    // determines if the application settings panel is visible
    settingsPanelVisible: boolean;
    // the current theme
    itheme: ITheme;
    // the name of the current theme
    name: string;
    // the current map of the theme names and their associated color palettes
    palettes: HashMap<string, Palette>;
    // network-description, path, template path, and modification state
    networkDescriptionTemplatePath: string;
    networkDescription: string;
    networkDescriptionPath: string;
    networkDescriptionModified: boolean;
    // environment, path, template path, and modification state
    sensorDescriptionTemplatePath: string;
    sensorDescription: string;
    sensorDescriptionPath: string;
    sensorDescriptionModified: boolean;
}

interface DispatchProps {
    onClearErrorMessages: () => void;
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    onChangeTheme: (theme: string) => void;

    onLoadNetworkDescriptionTemplate: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onLoadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onSaveNetworkDescription: (path: string, description: string) => Promise<NetworkDescriptionSavedAction>;

    onLoadSensorDescriptionTemplate: (path: string) => Promise<SensorsLoadedAction>;
    onLoadSensorDescription: (path: string) => Promise<SensorsLoadedAction>;
    onSaveSensorDescription: (path: string, codeSnippet: string) => Promise<SensorsSavedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

function Main(props: Props): JSX.Element {
    const {
        name,

        settingsPanelVisible,
        onShowSettingsPanel,
        onHideSettingsPanel,

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
    } = props;

    // react-router history
    const history = useHistory();
    // const location = useLocation();

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
                            key: 'newSimulation',
                            text: 'New Simulation',
                            iconProps: {iconName: 'add'},
                            onClick: () => history.push(AppPath.SIMULATION)
                        },
                        {
                            key: 'loadSimulation',
                            text: 'Load Simulation',
                            iconProps: {iconName: 'upload'},
                            onClick: () => history.push(AppPath.SIMULATION)
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
                            onClick: () => handleEditNetwork()
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
                            onClick: () => handleNewNetwork()
                        },
                        {
                            key: 'loadNetwork',
                            text: 'Load...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Load Network',
                            onClick: () => handleLoadNetworkDescription()
                        },
                        {
                            key: 'saveNetwork',
                            text: 'Save',
                            iconProps: {iconName: 'save'},
                            ariaLabel: 'Save Network',
                            disabled: !networkDescriptionPath || !networkDescriptionModified || !useRouteMatch(AppPath.NETWORK_EDITOR) || networkDescriptionPath === networkDescriptionTemplatePath,
                            onClick: () => handleSaveNetworkDescription()
                        },
                        {
                            key: 'saveNetworkAs',
                            text: 'Save As...',
                            ariaLabel: 'Save Network As',
                            iconProps: {iconName: 'save'},
                            disabled: !useRouteMatch(AppPath.NETWORK_EDITOR),
                            onClick: () => handleSaveNetworkDescriptionAs()
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
                            iconProps: {iconName: 'homegroup'},
                            ariaLabel: 'Edit Network Sensor',
                            onClick: () =>  handleEditSensor(),
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
                            onClick: () => handleNewSensor()
                        },
                        {
                            key: 'loadSensor',
                            text: 'Load...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Load Network Sensor',
                            onClick: () => handleLoadSensor()
                        },
                        {
                            key: 'saveSensor',
                            text: 'Save',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Save Network Sensor',
                            onClick: () => handleSaveSensor()
                        },
                        {
                            key: 'saveSensorAs',
                            text: 'Save As...',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Save Network Sensor As',
                            onClick: () => handleSaveSensorAs()
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
        return [
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
                // onClick: () => settingVisibilityManager(true)
            }
        ];
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
        // todo hold on to this for a bit; when enableRemoteModule is false, then must use
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

    return (
        <Stack>
            <StackItem>
                {props.errorMessages.map(messages => (
                    <MessageBar
                        key="error-messages"
                        messageBarType={MessageBarType.blocked}
                        isMultiline={false}
                        truncated={true}
                        theme={props.itheme}
                        onDismiss={props.onClearErrorMessages}
                        dismissButtonAriaLabel="Close"
                        overflowButtonAriaLabel="See more"
                    >
                        {messages}
                    </MessageBar>
                )).getOrElse((<div/>))}
            </StackItem>
            <StackItem>
                <CommandBar
                    items={menuItems()}
                    farItems={farMenuItems(handleSettingsPanelVisibility)}
                />
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
                            />
                        }
                    />
                    <Route
                        path={`${AppPath.NETWORK_EDITOR}/:networkDescriptionPath`}
                        render={(renderProps) =>
                            <NetworkEditor
                                baseRouterPath={AppPath.NETWORK_EDITOR}
                                theme={editorThemeFrom(name)}
                                itheme={props.itheme}
                                {...renderProps}
                            />
                        }
                    />
                    <Route
                        path={`${AppPath.SENSOR_EDITOR}/:sensorsPath`}
                        render={(renderProps) =>
                            <SensorsEditor
                                baseRouterPath={AppPath.SENSOR_EDITOR}
                                theme={editorThemeFrom(name)}
                                itheme={props.itheme}
                                {...renderProps}
                            />
                        }
                    />
                </Switch>
            </StackItem>
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
 * @param ownProps The current properties of the `App` component
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    ...ownProps,
    errorMessages: state.application.errorMessages,
    settingsPanelVisible: state.application.settingsPanelVisible,
    itheme: state.settings.itheme,
    name: state.settings.name,
    palettes: state.settings.palettes,

    networkDescriptionTemplatePath: state.settings.networkDescription.templatePath,
    networkDescription: state.networkDescription.description,
    networkDescriptionPath: state.networkDescription.path,
    networkDescriptionModified: state.networkDescription.modified,

    sensorDescriptionTemplatePath: state.settings.sensorDescription.templatePath,
    sensorDescription: state.sensorDescription.codeSnippet,
    sensorDescriptionPath: state.sensorDescription.path,
    sensorDescriptionModified: state.sensorDescription.modified,

});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onClearErrorMessages: () => dispatch(clearErrorMessages()),
    onShowSettingsPanel: () => dispatch(showSettingsPanel()),
    onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
    onChangeTheme: (theme: string) => dispatch(changeTheme(theme)),

    onLoadNetworkDescriptionTemplate: (path: string) => dispatch(loadNetworkDescriptionFromTemplate(path)),
    onLoadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    onSaveNetworkDescription: (path: string, description: string) => dispatch(persistNetworkDescription(path, description)),

    onLoadSensorDescriptionTemplate: (path: string) => dispatch(loadSensorsFromTemplate(path)),
    onLoadSensorDescription: (path: string) => dispatch(loadSensorsFrom(path)),
    onSaveSensorDescription: (path: string, codeSnippet: string) => dispatch(saveSensors(path, codeSnippet)),
});

const connectedApp = connect(mapStateToProps, mapDispatchToProps)(Main)

export default withRouter(connectedApp)
