import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import MonacoEditor from "./MonacoEditor";
import {SPIKES_LANGUAGE_ID} from '../language/spikes-language';
import {useHistory, useParams, useRouteMatch, withRouter} from "react-router-dom";
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
import {IconButton, MessageBar, MessageBarType, Separator, Text, TooltipHost} from '@fluentui/react';
import {remote} from "electron";
import {KeyboardShortcut, keyboardShortcutFor} from "./keyboardShortcuts";
import {baseRouterPathFrom} from '../router/router';
import {noop} from "../../commons";
import NetworkTopologyVisualization from "../network/NetworkTopologyVisualization";
import {useTheme} from "../common/useTheme";
import {editor} from "monaco-editor/esm/vs/editor/editor.api";
import {
    Grid,
    gridArea,
    gridTemplateAreasBuilder,
    gridTrackTemplateBuilder,
    useGridCell,
    withFraction,
    withGridTrack,
    withPixels,
    useGridCellHeight,
    useGridCellWidth,
    GridItem
} from 'react-resizable-grid-layout';
import {NEW_PROJECT_PATH} from "../simulation/SimulationManager";

export const NEW_NETWORK_PATH = '**new**';

const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};

const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

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

type Props = StateProps & DispatchProps

/**
 * Wrapper for the monaco editor that manages resizing and theme updates
 * @param props The properties holding the current theme
 * @return The network editor
 * @constructor
 */
function NetworkEditor(props: Props): JSX.Element {
    const {
        networkDescription,
        templatePath,
        onChanged,
        loadTemplate,
        loadNetworkDescription,
        onSave,
        modified,
        networkDescriptionPath,
    } = props;

    const {itheme, themeName, themes} = useTheme()

    // creates the map holding the them names and their associated editor themes
    const {current: editorThemes} = useRef<Map<string, editor.IStandaloneThemeData>>(
        themes.mapValues(info => info.editor).toJsMap(key => key)
    )

    // when user refreshes when the router path is this editor, then we want to load the same
    // network as before the refresh. to do this we use the path parameter holding the file path
    // to the network description, and keep it consistent when loading from template
    const {networkPath} = useParams<{ [key: string]: string }>();
    const history = useHistory();
    const {path} = useRouteMatch();

    const [baseRouterPath, setBaseRouterPath] = useState<string>(baseRouterPathFrom(path));

    // const editorRef = useRef<HTMLDivElement>();
    // const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});
    // const heightFractionRef = useRef(1.0);

    // whether to show the simulation panel
    const [showSimulation, setShowSimulation] = useState(false);

    const [message, setMessage] = useState<JSX.Element>();

    // when the network description file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the network description,
    // or a template
    useEffect(
        () => {
            // if the network description is not yet loaded, then leave it for the
            // next useEffect to load
            if (networkDescription === undefined || networkDescription === '') {
                return;
            }

            // the network path must have changed, in which case, load the network description
            // or a template
            const filePath = decodeURIComponent(networkPath);
            if (filePath !== networkDescriptionPath) {
                loadNetworkDescriptionOrTemplate(filePath);
            }
        },
        [networkPath]
    )

    // when component mounts, loads the network description if needed, sets the initial dimension
    // of the editor and registers to listen to window resize events. when component unmounts,
    // removes the window-resize event listener
    useEffect(
        () => {
            // when the network description has not been loaded and handed to this component
            // as a property, load it based on the file path
            if (networkDescription === undefined || networkDescription === '') {
                loadNetworkDescriptionOrTemplate(decodeURIComponent(networkPath));
            }
        },
        []
    )

    /**
     * Loads the network description from the specified file path, or, if the
     * file path is for a new network description, then loads the network desription
     * template
     * @param filePath The path to the network description file
     */
    function loadNetworkDescriptionOrTemplate(filePath: string): void {
        if (filePath === NEW_NETWORK_PATH || filePath === 'undefined') {
            loadTemplate(templatePath)
                .then(() => console.log("loaded"))
                .catch(reason => setMessage(errorMessage(reason.message)))
        } else {
            loadNetworkDescription(filePath)
                .then(() => console.log("loaded"))
                .catch(reason => setMessage(errorMessage(reason.message)))
        }
    }

    // recalculate the base path when the path changes (note that the base path won't change)
    useEffect(
        () => {
            setBaseRouterPath(baseRouterPathFrom(path));
        },
        [path]
    )

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
        setShowSimulation(true);
    }

    /**
     * Sets the state so that the sensor simulation window is hidden
     */
    function hideSimulationLayer(): void {
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
                    onClick={handleNew}
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
        <div onKeyDown={handleKeyboardShortcut}>
        <Grid
            dimensionsSupplier={useGridCell}
            gridTemplateRows={gridTrackTemplateBuilder()
                .addTrack(withPixels(30))
                .repeatFor(showSimulation ? 2 : 1, withGridTrack(withFraction(1)))
                .build()
            }
            gridTemplateColumns={gridTrackTemplateBuilder()
                .addTrack(withPixels(SIDEBAR_WIDTH))
                .addTrack(withFraction(1))
                .build()
            }
            gridTemplateAreas={gridTemplateAreasBuilder()
                .addArea('networkDescriptionPath', gridArea(1, 2))
                .addArea('networkEditorSidebar', gridArea(1, 1, 2, 1))
                .addArea('networkEditor', gridArea(2, 2))
                .addArea('networkSimulation', gridArea(3, 2))
                .build()
            }
        >
            <GridItem
                gridAreaName='networkDescriptionPath'
                styles={{display: 'flex', alignItems: 'center', marginLeft: 10}}
            >
                <Text
                    variant="medium"
                    style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                >
                    {networkDescriptionPath === undefined || networkDescriptionPath === templatePath ?
                        '[new file]' :
                        networkDescriptionPath
                    }{modified ? '*' : ''}
                </Text>
            </GridItem>
            <GridItem gridAreaName='networkEditorSidebar'>
                <div>
                    {newButton()}
                    {saveButton()}
                    {loadButton()}
                    {buildButton()}
                    <Separator/>
                    {showSimulationButton()}
                </div>
            </GridItem>
            <GridItem gridAreaName='networkEditor'>
                <MonacoEditor
                    editorId='spikes-lang'
                    width={useGridCellWidth()}
                    height={useGridCellHeight()}
                    language={SPIKES_LANGUAGE_ID}
                    theme={themeName}
                    customThemes={editorThemes}
                    value={networkDescription}
                    options={editorOptions}
                    onChange={(value: string) => onChanged(value)}
                    editorDidMount={noop}
                />
            </GridItem>
            <GridItem gridAreaName='networkSimulation' isVisible={showSimulation}>
                <NetworkTopologyVisualization
                    itheme={itheme}
                    sceneWidth={useGridCellWidth()}
                    sceneHeight={useGridCellHeight()}
                    onClose={hideSimulationLayer}
                />
            </GridItem>
        </Grid>
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
