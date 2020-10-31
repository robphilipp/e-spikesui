import * as React from 'react'
import {useEffect} from 'react'
import {CommandBar, ITheme, MessageBar, MessageBarType, Stack, StackItem} from '@fluentui/react'
import {Palette} from "../theming";
import {connect} from 'react-redux';
import {AppState} from "./redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {changeTheme, hideSettingsPanel, showSettingsPanel} from "./redux/actions/settings";
import {ApplicationAction, clearErrorMessages} from "./redux/actions/actions";
import {HashMap, Option} from "prelude-ts";
import SettingsPanel from "./settings/SettingsPanel";
import {Route, RouteComponentProps, Switch, withRouter} from 'react-router-dom';
import NetworkEditor, {editorThemeFrom} from "./network/NetworkEditor";
import {registerSpikesLanguage} from "./language/spikes-language";
import {loadTemplateOrInitialize, readNetworkDescription, saveNetworkDescription} from "./network/networkDescription";
import {loadedNetworkDescriptionFromTemplate, networkDescriptionLoaded, networkDescriptionSaved} from "./redux/actions/networkDescription";
import {remote} from "electron";


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
    // network-description template
    networkDescriptionTemplate: string;
    //
    networkDescription: string;
    networkDescriptionPath: string;
    networkDescriptionModified: boolean;
}

interface DispatchProps {
    onClearErrorMessages: () => void;
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    onChangeTheme: (theme: string) => void;
    onNetworkDescriptionTemplateLoaded: (description: string) => void;
    onNetworkDescriptionSaved: (path: string) => void;
    onNetworkDescriptionLoaded: (description: string, path: string) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

function Main(props: Props): JSX.Element {
    const {
        name,

        settingsPanelVisible,
        onShowSettingsPanel,
        onHideSettingsPanel,

        networkDescriptionTemplate,
        onNetworkDescriptionTemplateLoaded,

        networkDescription,
        networkDescriptionModified,
        networkDescriptionPath,
        onNetworkDescriptionSaved,
        onNetworkDescriptionLoaded,
    } = props;

    useEffect(
        () => {
            registerSpikesLanguage();
        },
        []
    )

    /**
     * Returns a list of menu items at the top of the page
     * @return {{onClick: () => void; cacheKey: string; name: string; iconProps: {iconName: string}; key: string; ariaLabel: string}[]}
     */
    function menuItems() {
        return [
            {
                key: 'simulation',
                name: 'Simulation',
                cacheKey: 'simulation-cache-key',
                iconProps: {iconName: 'brain'},
                ariaLabel: 'Simulation',
                // onClick: () => props.history.push('spikes-chart')
                subMenuProps: {
                    items: [
                        {
                            key: 'newSimulation',
                            text: 'New Simulation',
                            iconProps: {iconName: 'add'},
                            // onClick: () => props.history.push('spikes-chart')
                        },
                        {
                            key: 'loadSimulation',
                            text: 'Load Simulation',
                            iconProps: {iconName: 'upload'},
                            // onClick: () => props.history.push('spikes-chart')
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
                // onClick: () => props.history.push('spikes-chart')
                subMenuProps: {
                    items: [
                        {
                            key: 'newNetwork',
                            text: 'New',
                            iconProps: {iconName: 'add'},
                            ariaLabel: 'New Network',
                            onClick: () => handleNewNetwork()
                        },
                        {
                            key: 'loadNetwork',
                            text: 'Load',
                            iconProps: {iconName: 'upload'},
                            ariaLabel: 'Load Network',
                            onClick: () => handleLoadNetworkDescription()
                        },
                        {
                            key: 'saveNetwork',
                            text: 'Save',
                            iconProps: {iconName: 'save'},
                            ariaLabel: 'Save Network',
                            disabled: !networkDescriptionPath || !networkDescriptionModified,
                            onClick: () => handleSaveNetworkDescription()
                        },
                        {
                            key: 'saveNetworkAs',
                            text: 'Save As...',
                            ariaLabel: 'Save Network As',
                            iconProps: {iconName: 'save'},
                            onClick: () => handleSaveNetworkDescriptionAs()
                        },
                    ],
                },
            },
            {
                key: 'environment',
                name: 'Environment',
                cacheKey: 'environment-cache-key',
                iconProps: {iconName: 'environment'},
                subMenuProps: {
                    items: [
                        {
                            key: 'newEnvironment',
                            text: 'New Environment',
                            iconProps: {iconName: 'add'},
                            // onClick: () => props.history.push('spikes-chart')
                        },
                        {
                            key: 'loadEnvironment',
                            text: 'Load Environment',
                            iconProps: {iconName: 'upload'},
                            // onClick: () => props.history.push('spikes-chart')
                        },
                    ],
                },
            }
        ];
    }

    /**
     * Returns a list of menu items on the upper right-hand side of the menu bar. For example, returns the settings
     * menu item.
     * @param {(visible: boolean) => void} settingVisibilityManager Manages the settings panel visibility state
     * @return {{onClick: () => void; iconOnly: boolean; name: string; iconProps: {iconName: string}; key: string; ariaLabel: string}[]}
     */
    function farMenuItems(settingVisibilityManager: (visible: boolean) => void) {
        return [
            {
                key: 'settings',
                name: 'Settings',
                ariaLabel: 'Settings',
                iconProps: {
                    iconName: 'Settings'
                },
                iconOnly: true,
                onClick: () => settingVisibilityManager(true)
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

    function handleSettingsPanelVisibility(): void {
        settingsPanelVisible ? onHideSettingsPanel() : onShowSettingsPanel();
    }

    function handleNewNetwork(): void {
        onNetworkDescriptionTemplateLoaded(loadTemplateOrInitialize(networkDescriptionTemplate));
        props.history.push('network-editor');
    }

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
                readNetworkDescription(response.filePaths[0])
                    .ifRight(description => onNetworkDescriptionLoaded(description, response.filePaths[0]))
            })
    }

    /**
     * Handles saving the network description to the current network description path.
     * If the current network description path is undefined, then revert to the 'save-as'
     * dialog
     */
    function handleSaveNetworkDescription(): void {
        if (networkDescriptionPath) {
            saveNetworkDescription(networkDescriptionPath, networkDescription)
                .ifRight(() => onNetworkDescriptionSaved(networkDescriptionPath));
        } else {
            // todo hold on to this for a bit; when enableRemoteModule is false, then must use
            //      IPC methods to open the dialog, etc
            // ipcRenderer.send('save-network-description');
            // ipcRenderer.once('save-network-description-path', (event, arg) => {
            //     console.log('file path');
            //     console.log(arg);
            // })
            handleSaveNetworkDescriptionAs();
        }
    }

    /**
     * Handles saving the network description file when the path is current set, or the user
     * would like to save the file to a new name.
     */
    function handleSaveNetworkDescriptionAs(): void {
        remote.dialog
            .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
            .then(retVal => {
                saveNetworkDescription(retVal.filePath, networkDescription)
                    .ifRight(() => onNetworkDescriptionSaved(retVal.filePath));
            })
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
                        path="/network-editor"
                        render={(renderProps) =>
                            <NetworkEditor
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
    networkDescriptionTemplate: state.settings.networkDescription.templatePath,
    networkDescription: state.networkDescription.description,
    networkDescriptionPath: state.networkDescription.path,
    networkDescriptionModified: state.networkDescription.modified
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} _ The component's own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onClearErrorMessages: () => dispatch(clearErrorMessages()),
    onShowSettingsPanel: () => dispatch(showSettingsPanel()),
    onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
    onChangeTheme: (theme: string) => dispatch(changeTheme(theme)),
    onNetworkDescriptionTemplateLoaded: (description: string) => dispatch(loadedNetworkDescriptionFromTemplate(description)),
    // onNetworkDescriptionChange: (description: string) => dispatch(changeNetworkDescription(description))
    onNetworkDescriptionSaved: (path: string) => dispatch(networkDescriptionSaved(path)),
    onNetworkDescriptionLoaded: (description: string, path: string) => dispatch(networkDescriptionLoaded(description, path)),

});

const connectedApp = connect(mapStateToProps, mapDispatchToProps)(Main)

export default withRouter(connectedApp)
