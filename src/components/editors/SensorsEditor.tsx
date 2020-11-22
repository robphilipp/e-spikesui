import * as React from 'react'
import {defaultCustomThemes, DefaultTheme} from './themes';
import {RouteComponentProps, useHistory, useParams, withRouter} from "react-router-dom";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {IconButton, ITheme, Stack, StackItem, TooltipHost} from '@fluentui/react';
import {
    SensorsLoadedAction,
    SensorsSavedAction,
    loadSensorsFrom,
    loadSensorsFromTemplate,
    saveSensors as persistEnvironment,
    updateSensors,
} from "../redux/actions/sensors";
import {useEffect, useRef, useState} from "react";
import {KeyboardShortcut, keyboardShortcutFor} from "./keyboardShortcuts";
import {remote} from "electron";
import MonacoEditor from "./MonacoEditor";


const customThemes = defaultCustomThemes();
const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};
const emptyFunction = () => {
    return;
}

const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

interface Dimension {
    height: number;
    width: number;
}

interface OwnProps extends RouteComponentProps<never> {
    baseRouterPath: string;
    itheme: ITheme;
    theme?: string;
}

interface StateProps {
    codeSnippet: string;
    modified: boolean;
    path?: string;
    templatePath?: string;
}

interface DispatchProps {
    onChanged: (description: string) => void;
    onLoadTemplate: (path: string) => Promise<SensorsLoadedAction>;
    onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    onSave: (path: string, description: string) => Promise<SensorsSavedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

function SensorsEditor(props: Props): JSX.Element {
    const {
        theme = DefaultTheme.DARK,
        codeSnippet,
        templatePath,
        onChanged,
        onLoadTemplate,
        onLoadSensor,
        onSave,
        modified,
        path,
        baseRouterPath,
    } = props;

    // when user refreshes when the router path is this editor, then we want to load the same
    // network as before the refresh. to do this we use the path parameter holding the file path
    // to the environment code-snippet, and keep it consistent when loading from template
    const {sensorsPath} = useParams<{ [key: string]: string }>();
    const history = useHistory();

    const editorRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});

    // the keyboard event listener holds a stale ref to the props, so we need to use a
    // reference that is updated for the event listener to use
    const keyboardEventRef = useRef({path, templatePath, codeSnippet});

    // when component mounts, sets the initial dimension of the editor and registers to listen
    // to window resize events. when component un-mounts, removes the window-resize event listener
    useEffect(
        () => {
            if (editorRef.current) {
                setDimension(editorDimensions());
            }

            // listen to resize events so that the editor width and height can be updated
            window.addEventListener('resize', handleWindowResize);
            window.addEventListener('keydown', handleKeyboardShortcut, true);

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', handleWindowResize);
                window.removeEventListener('keydown', handleKeyboardShortcut, true);
            }
        },
        []
    );

    // when the environment code-snippet file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the environment code-snippet,
    // or a template
    useEffect(
        () => {
            const filePath = decodeURIComponent(sensorsPath);
            if (filePath !== path || filePath === '') {
                // todo handle success and failure
                onLoadSensor(filePath)
                    .then(() => console.log("loaded"))
            }
        },
        [sensorsPath]
    );

    // the keyboard event listener holds a stale ref to the props, so we need to update
    // the referenced values when they change
    useEffect(
        () => {
            keyboardEventRef.current = {path, templatePath, codeSnippet};
        },
        [path, templatePath, codeSnippet]
    );

    /**
     * calculates the editors dimensions based on the `<div>`'s width and height
     * @return The dimension of the editor
     */
    function editorDimensions(): Dimension {
        return {
            width: editorRef.current.offsetWidth,
            height: editorRef.current.clientHeight
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
    function handleKeyboardShortcut(event: KeyboardEvent): void {
        keyboardShortcutFor(event).ifSome(shortcut => {
            switch (shortcut) {
                case KeyboardShortcut.NEW:
                    handleNew();
                    break;

                case KeyboardShortcut.SAVE: {
                    const {path, templatePath, codeSnippet} = keyboardEventRef.current;
                    handleSave(path, templatePath, codeSnippet);
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
                })
            .then(response => {
                history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
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
                    onClick={() => handleSave(path, templatePath, codeSnippet)}
                    disabled={!(modified || path === templatePath)}
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
            <TooltipHost content="Test network environment">
                <IconButton
                    iconProps={{iconName: 'homegroup'}}
                    disabled={modified || codeSnippet === undefined || codeSnippet.length < 31}
                />
            </TooltipHost>
        </div>
    }

    return (
        <div
            ref={editorRef}
            // can't just set a fraction for the height because the parent height may not be
            // set...but if it is, then you can use that.
            style={{height: window.innerHeight * 0.9, width: '100%'}}
        >
            <div
                style={{
                    marginLeft: 30,
                    marginBottom: 8,
                    height: 15,
                    color: props.itheme.palette.themeSecondary
                }}
            >
                {path === undefined || path === templatePath ? '[new file]' : path}{modified ? '*' : ''}
            </div>
            <Stack horizontal>
                <StackItem>
                    {newButton()}
                    {saveButton()}
                    {loadButton()}
                    {buildButton()}
                </StackItem>
                <StackItem>
                    <MonacoEditor
                        editorId='spikes-env'
                        width={dimension.width}
                        height={dimension.height}
                        language="javascript"
                        theme={theme}
                        customThemes={customThemes}
                        value={codeSnippet}
                        options={editorOptions}
                        onChange={(value: string) => onChanged(value)}
                        editorDidMount={emptyFunction}
                    />
                </StackItem>
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
    codeSnippet: state.environment.codeSnippet,
    modified: state.environment.modified,
    path: state.environment.path,
    templatePath: state.settings.environment.templatePath
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

const connectedEnvironmentEditor = connect(mapStateToProps, mapDispatchToProps)(SensorsEditor);

export default withRouter(connectedEnvironmentEditor);