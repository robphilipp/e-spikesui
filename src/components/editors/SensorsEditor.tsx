import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {useHistory, useParams, useRouteMatch, withRouter} from "react-router-dom";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {IconButton, Layer, LayerHost, MessageBar, MessageBarType, Separator, Stack, TooltipHost} from '@fluentui/react';
import {
    loadSensorsFrom,
    loadSensorsFromTemplate,
    saveSensors as persistEnvironment,
    SensorsLoadedAction,
    SensorsSavedAction,
    updateSensors,
} from "../redux/actions/sensors";
import {KeyboardShortcut, keyboardShortcutFor} from "./keyboardShortcuts";
import {remote} from "electron";
import MonacoEditor from "./MonacoEditor";
import SensorSimulation from "../sensors/SensorSimulation";
import {baseRouterPathFrom} from '../router/router';
import {noop} from "../../commons";
import {useTheme} from "../common/useTheme";
import {editor} from "monaco-editor/esm/vs/editor/editor.api";

export const NEW_SENSOR_PATH = '**new**';

export enum ExpressionState {
    PRE_COMPILED = 'pre-compiled',
    COMPILED = 'compiled',
    RUNNING = 'running'
}

const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};

const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

interface Dimension {
    height: number;
    width: number;
}

interface StateProps {
    codeSnippet: string;
    timeFactor: number;
    modified: boolean;
    sensorDescriptionPath?: string;
    templatePath?: string;
}

interface DispatchProps {
    onChanged: (description: string) => void;
    onLoadTemplate: (path: string) => Promise<SensorsLoadedAction>;
    onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    onSave: (path: string, description: string) => Promise<SensorsSavedAction>;
}

type Props = StateProps & DispatchProps

/**
 * The sensor editor allows the user to write a sensor code-snippet and run a test simulation
 * to see the timing as a raster chart.
 * @param props Properties form the parent, redux state, and dispatchers
 * @return Screen that holds the sensor code-snippet editor and sensor simulation output
 */
function SensorsEditor(props: Props): JSX.Element {
    const {
        codeSnippet,
        timeFactor,
        templatePath,
        onChanged,
        onLoadTemplate,
        onLoadSensor,
        onSave,
        modified,
        sensorDescriptionPath,
    } = props;

    const {itheme, themeName, themes} = useTheme()

    // creates the map holding the them names and their associated editor themes
    const {current: editorThemes} = useRef<Map<string, editor.IStandaloneThemeData>>(
        themes.mapValues(info => info.editor).toJsMap(key => key)
    )

    // when user refreshes when the router path is this editor, then we want to load the same
    // sensor as before the refresh. to do this we use the path parameter holding the file path
    // to the sensor code-snippet, and keep it consistent when loading from template
    const {sensorsPath} = useParams<{ [key: string]: string }>();
    const history = useHistory();
    const {path} = useRouteMatch();

    const [baseRouterPath, setBaseRouterPath] = useState<string>(baseRouterPathFrom(path));

    const editorRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});
    const heightFractionRef = useRef(1.0);

    // whether to show the simulation panel
    const [showSimulation, setShowSimulation] = useState(false);

    const [message, setMessage] = useState<JSX.Element>();


    // when the environment code-snippet file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the environment code-snippet,
    // or a template
    useEffect(
        () => {
            // when the code snippet hasn't been loaded, then defer to the next useEffect
            // to handle loading it
            if (codeSnippet === undefined || codeSnippet === '') {
                return;
            }

            // the path to the sensor code snippet must have changed, so load it
            const filePath = decodeURIComponent(sensorsPath);
            if (filePath !== sensorDescriptionPath) {
                loadCodeSnippetOrTemplate(filePath);
            }
        },
        [sensorsPath]
    );

    // when component mounts, loads the code snippet if needed, sets the initial dimension of the
    // editor and registers to listen to window resize events. when component un-mounts, removes
    // the window-resize event listener
    useEffect(
        () => {
            // when the network description has not been loaded and handed to this component
            // as a property, load it based on the file path
            if (codeSnippet === undefined || codeSnippet === '') {
                loadCodeSnippetOrTemplate(decodeURIComponent(sensorsPath));
            }

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
    );

    /**
     * Loads the code snippet describing the sensor, or if the file path is for a new
     * code snippet, then loads the template
     * @param filePath The path to the file holding the code snippet
     */
    function loadCodeSnippetOrTemplate(filePath: string): void {
        if (filePath === NEW_SENSOR_PATH || filePath === 'undefined') {
            onLoadTemplate(templatePath)
                .then(() => console.log("loaded"))
                .catch(reason => setMessage(errorMessage(reason.message)))
        } else {
            onLoadSensor(filePath)
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
                    handleSave(sensorDescriptionPath, templatePath, codeSnippet);
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
        onLoadTemplate(templatePath)
            .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(templatePath)}`))
    }

    /**
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     * @param path The path to the sensor description file
     * @param templatePath The path to the template for creating new sensor descriptions
     * @param sensor The sensor description (code snippet)
     */
    function handleSave(path: string, templatePath: string, sensor: string): void {
        // if the state path is set and the path does not equal the template path, then the sensor
        // description is from an existing file, and we can just save it. otherwise, we need to up a
        // dialog so that the user can give the filename
        if (path && path !== templatePath) {
            // todo handle success and error
            onSave(path, sensor).then(() => console.log('saved'));
        } else {
            remote.dialog
                .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
                .then(response => onSave(response.filePath, sensor)
                    .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(response.filePath)}`))
                );
        }
    }

    /**
     * Handle loading a sensor description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoad(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-sensor', extensions: ['sensor']}],
                    properties: ['openFile']
                }
            )
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
        heightFractionRef.current = 0.5;
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
            <TooltipHost content="New network environment from template">
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
            <TooltipHost content="Save network environment">
                <IconButton
                    iconProps={{iconName: 'save'}}
                    onClick={() => handleSave(sensorDescriptionPath, templatePath, codeSnippet)}
                    disabled={!(modified || sensorDescriptionPath === templatePath)}
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
            <TooltipHost content="Load network environment">
                <IconButton
                    iconProps={{iconName: 'upload'}}
                    onClick={handleLoad}
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
            <TooltipHost content={showSimulation ?
                "Hide sensor simulation control panel" :
                "Show sensor simulation control panel"
            }>
                <IconButton
                    iconProps={{iconName: showSimulation ? 'noEye' : 'eye'}}
                    disabled={codeSnippet?.length < 10}
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
                    color: itheme.palette.themeSecondary
                }}
            >
                {sensorDescriptionPath === undefined || sensorDescriptionPath === templatePath ?
                    '[new file]' :
                    sensorDescriptionPath
                }{modified ? '*' : ''}
            </div>
            <Stack horizontal>
                <Stack.Item>
                    {newButton()}
                    {saveButton()}
                    {loadButton()}
                    <Separator/>
                    {showSimulationButton()}
                </Stack.Item>
                <Stack>
                    <Stack.Item>
                        <MonacoEditor
                            editorId='spikes-env'
                            width={dimension.width}
                            height={dimension.height}
                            language="javascript"
                            theme={themeName}
                            customThemes={editorThemes}
                            value={codeSnippet}
                            options={editorOptions}
                            onChange={onChanged}
                            editorDidMount={noop}
                        />
                        {showSimulation && <LayerHost id='chart-layer'/>}
                    </Stack.Item>
                </Stack>
            </Stack>
            {showSimulation &&
            <Layer hostId="chart-layer">
                <Separator>Sensor Simulation</Separator>
                <SensorSimulation
                    itheme={itheme}
                    codeSnippet={codeSnippet}
                    timeFactor={timeFactor}
                    onClose={hideSimulationLayer}
                />
            </Layer>}
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
    codeSnippet: state.sensorDescription.codeSnippet,
    timeFactor: state.simulationProject.timeFactor,
    modified: state.sensorDescription.modified,
    sensorDescriptionPath: state.sensorDescription.path,
    templatePath: state.settings.sensorDescription.templatePath
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onChanged: (codeSnippet: string) => dispatch(updateSensors(codeSnippet)),
    onLoadTemplate: (path: string) => dispatch(loadSensorsFromTemplate(path)),
    onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    onSave: (path: string, description: string) => dispatch(persistEnvironment(path, description)),
});

const connectedSensorEditor = connect(mapStateToProps, mapDispatchToProps)(SensorsEditor);

export default withRouter(connectedSensorEditor);