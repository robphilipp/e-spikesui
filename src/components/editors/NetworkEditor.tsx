import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import MonacoEditor from "./MonacoEditor";
import {defaultCustomThemes, DefaultTheme} from './themes';
import {SPIKES_LANGUAGE_ID} from '../language/spikes-language';
import {RouteComponentProps, useHistory, useParams, useRouteMatch, withRouter} from "react-router-dom";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {
    loadNetworkDescriptionFrom,
    loadNetworkDescriptionFromTemplate,
    NetworkDescriptionLoadedAction,
    NetworkDescriptionSavedAction,
    saveNetworkDescription as persistNetworkDescription,
    updateNetworkDescription
} from '../redux/actions/networkDescription';
import {connect} from "react-redux";
import {
    IconButton,
    ITheme,
    Layer, LayerHost,
    MessageBar,
    MessageBarType,
    Separator,
    Stack,
    StackItem,
    TooltipHost
} from '@fluentui/react';
import {remote} from "electron";
import {KeyboardShortcut, keyboardShortcutFor} from "./keyboardShortcuts";
import {baseRouterPathFrom} from '../router/router';
import {noop} from "../../commons";
import SensorSimulation from "../sensors/SensorSimulation";
import NetworkTopologyVisualization from "../network/NetworkTopologyVisualization";

export const NEW_NETWORK_PATH = '**new**';

const customThemes = defaultCustomThemes();
const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};

const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

interface Dimension {
    height: number;
    width: number;
}

interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;
    theme?: string;
}

interface StateProps {
    networkDescription: string;
    modified: boolean;
    networkDescriptionPath?: string;
    templatePath?: string;
}

interface DispatchProps {
    onChanged: (description: string) => void;
    onSave: (path: string, description: string) => Promise<NetworkDescriptionSavedAction>;
    loadTemplate: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    loadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Wrapper for the monaco editor that manages resizing and theme updates
 * @param props The properties holding the current theme
 * @return The network editor
 * @constructor
 */
function NetworkEditor(props: Props): JSX.Element {
    const {
        itheme,
        theme = DefaultTheme.DARK,
        networkDescription,
        templatePath,
        onChanged,
        loadTemplate,
        loadNetworkDescription,
        onSave,
        modified,
        networkDescriptionPath,
    } = props;

    // when user refreshes when the router path is this editor, then we want to load the same
    // network as before the refresh. to do this we use the path parameter holding the file path
    // to the network description, and keep it consistent when loading from template
    const {networkPath} = useParams<{ [key: string]: string }>();
    const history = useHistory();
    const {path} = useRouteMatch();

    const [baseRouterPath, setBaseRouterPath] = useState<string>(baseRouterPathFrom(path));

    const editorRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});
    const heightFractionRef = useRef(1.0);

    // whether to show the simulation panel
    const [showSimulation, setShowSimulation] = useState(false);

    const [message, setMessage] = useState<JSX.Element>();

    // when component mounts, sets the initial dimension of the editor and registers to listen
    // to window resize events. when component unmounts, removes the window-resize event listener
    useEffect(
        () => {
            if (editorRef.current) {
                setDimension(editorDimensions());
            }

            // listen to resize events so that the editor width and height can be updated
            window.addEventListener('resize', handleWindowResize);

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', handleWindowResize);
            }
        },
        []
    )

    // when the network description file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the network description,
    // or a template
    useEffect(
        () => {
            const filePath = decodeURIComponent(networkPath);
            if (filePath === networkDescriptionPath) {
                return;
            }
            if (filePath === NEW_NETWORK_PATH || filePath === 'undefined') {
                loadTemplate(templatePath)
                    .then(() => console.log("loaded"))
                    .catch(reason => setMessage(errorMessage(reason.message)))
            } else {
                loadNetworkDescription(filePath)
                    .then(() => console.log("loaded"))
                    .catch(reason => setMessage(errorMessage(reason.message)))
            }
        },
        [networkPath]
    )

    // recalculate the base path when the path changes (note that the base path won't change)
    useEffect(
        () => {
            setBaseRouterPath(baseRouterPathFrom(path));
        },
        [path]
    )

    /**
     * calculates the editors dimensions based on the `<div>`'s width and height
     * @return The dimension of the editor
     */
    function editorDimensions(): Dimension {
        return {
            width: editorRef.current.offsetWidth - 25,
            height: editorRef.current.clientHeight * heightFractionRef.current
        };
    }

    /**
     * updates the editor's width and height when the container's dimensions change
     */
    function handleWindowResize(): void {
        if (editorRef.current) {
            const nextDimension = editorDimensions()
            const minDiff = 2;
            if (Math.abs(nextDimension.height - dimension.height) > minDiff ||
                Math.abs(nextDimension.width - dimension.width) > minDiff) {
                setDimension(nextDimension);
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
                    handleNew();
                    break;

                case KeyboardShortcut.SAVE: {
                    handleSave(networkDescriptionPath, templatePath, networkDescription);
                    break;
                }

                case KeyboardShortcut.LOAD:
                    handleLoad();
                    break;

                default:
                /* nothing to do */
            }
        });
    }

    /**
     * Handles loading a new network from a template file.
     */
    function handleNew(): void {
        loadTemplate(templatePath)
            .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(templatePath)}`))
    }

    /**
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     */
    function handleSave(path: string, templatePath: string, network: string): void {
        // if the state path is set and the path does not equal the template path, then the network
        // description is from an existing file, and we can just save it. otherwise, we need to up a
        // dialog so that the user can give the filename
        if (path && path !== templatePath) {
            // todo handle success and error
            onSave(path, network).then(() => console.log('saved'));
        } else {
            remote.dialog
                .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
                .then(response => onSave(response.filePath, network)
                    .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(response.filePath)}`))
                );
        }
    }

    /**
     * Handle loading a network description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoad(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-network', extensions: ['boo']}],
                    properties: ['openFile']
                })
            .then(response => {
                history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Toggles the simulation layer's visibility
     */
    function toggleShowSimulationLayer(): void {
        if (showSimulation) {
            hideSimulationLayer()
        } else {
            showSimulationLayer()
        }
    }

    /**
     * Sets the state so that the sensor simulation window is visible
     */
    function showSimulationLayer(): void {
        heightFractionRef.current = 0.4;
        setDimension(editorDimensions());
        setShowSimulation(true);
    }

    /**
     * Sets the state so that the sensor simulation window is hidden
     */
    function hideSimulationLayer(): void {
        heightFractionRef.current = 1.0;
        setDimension(editorDimensions());
        setShowSimulation(false);
    }

    /**
     * Create a button to create a new network
     * @return a button to create a new network
     */
    function newButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="New network description from template">
                <IconButton
                    iconProps={{iconName: 'add'}}
                    onClick={() => handleNew()}
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
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="Save network description">
                <IconButton
                    iconProps={{iconName: 'save'}}
                    onClick={() => handleSave(networkDescriptionPath, templatePath, networkDescription)}
                    disabled={!(modified || networkDescriptionPath === templatePath)}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Presents the user with a open-file dialog for selecting a network description
     * file.
     * @return The load button for the sidebar
     */
    function loadButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="Load network description">
                <IconButton
                    iconProps={{iconName: 'upload'}}
                    onClick={() => handleLoad()}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Creates a build button when the network description is saved and can be used to
     * build a network.
     * @return The build-button component
     */
    function buildButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="Deploy network description to server">
                <IconButton
                    iconProps={{iconName: 'homegroup'}}
                    disabled={modified || networkDescription === undefined || networkDescription.length < 31}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Renders the button the shows the simulation panel
     * @return The button for showing the simulation
     */
    function showSimulationButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content={showSimulation ? "Hide network visualization" : "Show network visualization"}>
                <IconButton
                    iconProps={{iconName: showSimulation ? 'noEye' : 'eye'}}
                    disabled={networkDescription?.length < 10}
                    onClick={toggleShowSimulationLayer}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Message bar for displaying errors
     * @param message The error message
     * @return A `MessageBar` with an error message
     */
    function errorMessage(message: string): JSX.Element {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                isMultiline={false}
                onDismiss={() => setMessage(undefined)}
                dismissButtonAriaLabel="Close"
            >
                {message}
            </MessageBar>
        )
    }

    return (
        <div
            ref={editorRef}
            // can't just set a fraction for the height because the parent height may not be
            // set...but if it is, then you can use that.
            style={{height: window.innerHeight * 0.9, width: '100%'}}
            onKeyDown={handleKeyboardShortcut}
        >
            {message || <span/>}
            <div
                style={{
                    marginLeft: 30,
                    marginBottom: 8,
                    height: 15,
                    color: props.itheme.palette.themeSecondary
                }}
            >
                {networkDescriptionPath === undefined || networkDescriptionPath === templatePath ?
                    '[new file]' :
                    networkDescriptionPath
                }{modified ? '*' : ''}
            </div>
            <Stack horizontal>
                <StackItem>
                    {newButton()}
                    {saveButton()}
                    {loadButton()}
                    {buildButton()}
                    <Separator/>
                    {showSimulationButton()}
                </StackItem>
                <StackItem>
                    <MonacoEditor
                        editorId='spikes-lang'
                        width={dimension.width}
                        height={dimension.height}
                        language={SPIKES_LANGUAGE_ID}
                        theme={theme}
                        customThemes={customThemes}
                        value={networkDescription}
                        options={editorOptions}
                        onChange={(value: string) => onChanged(value)}
                        editorDidMount={noop}
                    />
                    {showSimulation && <LayerHost id='chart-layer'/>}
                </StackItem>
                {showSimulation &&
                <Layer hostId="chart-layer" style={{width: '100%'}}>
                    <Separator>Network Topology</Separator>
                    <NetworkTopologyVisualization
                        itheme={itheme}
                        sceneHeight={window.innerHeight * 0.9 - dimension.height - 75}
                        sceneWidth={window.innerWidth - 100}
                        onClose={hideSimulationLayer}
                    />
                </Layer>}
            </Stack>
        </div>
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
 */
const mapStateToProps = (state: AppState): StateProps => ({
    networkDescription: state.networkDescription.description,
    modified: state.networkDescription.modified,
    networkDescriptionPath: state.networkDescription.path,
    templatePath: state.settings.networkDescription.templatePath
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onChanged: (description: string) => dispatch(updateNetworkDescription(description)),
    onSave: (path: string, description: string) => dispatch(persistNetworkDescription(path, description)),
    loadTemplate: (path: string) => dispatch(loadNetworkDescriptionFromTemplate(path)),
    loadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
});

const connectedNetworkEditor = connect(mapStateToProps, mapDispatchToProps)(NetworkEditor);

export default withRouter(connectedNetworkEditor);
