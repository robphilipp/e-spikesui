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
import {IconButton, ITheme, MessageBar, MessageBarType, Stack, StackItem, TooltipHost} from '@fluentui/react';
import {remote} from "electron";
import {KeyboardShortcut, keyboardShortcutFor} from "./keyboardShortcuts";
import { baseRouterPathFrom } from '../router/router';
import {noop} from "../../commons";

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
    network: string;
    modified: boolean;
    networkDescriptionPath?: string;
    templatePath?: string;
}

interface DispatchProps {
    onChanged: (description: string) => void;
    onLoadTemplate: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onLoadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onSave: (path: string, description: string) => Promise<NetworkDescriptionSavedAction>;
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
        theme = DefaultTheme.DARK,
        network,
        templatePath,
        onChanged,
        onLoadTemplate,
        onLoadNetworkDescription,
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

    // the keyboard event listener holds a stale ref to the props, so we need to use a
    // reference that is updated for the event listener to use
    // const keyboardEventRef = useRef({path, templatePath, network});

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
            // window.addEventListener('keydown', handleKeyboardShortcut, true);

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', handleWindowResize);
                // window.removeEventListener('keydown', handleKeyboardShortcut, true);
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
            // if (filePath !== path || filePath === '') {
            //     // todo handle success and failure
            //     onLoadNetworkDescription(filePath)
            //         .then(() => console.log("loaded"))
            // }
            if (filePath === networkDescriptionPath) {
                return;
            }
            if (filePath === NEW_NETWORK_PATH || filePath === 'undefined') {
                onLoadTemplate(templatePath)
                .then(() => console.log("loaded"))
                .catch(reason => setMessage(errorMessage(reason.message)))
            } else {
            // todo handle success and failure
                onLoadNetworkDescription(filePath)
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
    

    // // the keyboard event listener holds a stale ref to the props, so we need to update
    // // the referenced values when they change
    // useEffect(
    //     () => {
    //         keyboardEventRef.current = {path, templatePath, network};
    //     },
    //     [path, templatePath, network]
    // )

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
    function handleKeyboardShortcut(event: React.KeyboardEvent<HTMLDivElement>): void {
        keyboardShortcutFor(event.nativeEvent).ifSome(shortcut => {
            switch (shortcut) {
                case KeyboardShortcut.NEW:
                    handleNew();
                    break;

                case KeyboardShortcut.SAVE: {
                    // const {path, templatePath, network} = keyboardEventRef.current;
                    handleSave(networkDescriptionPath, templatePath, network);
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
                    onClick={() => handleSave(networkDescriptionPath, templatePath, network)}
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
                    disabled={modified || network === undefined || network.length < 31}
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
                {networkDescriptionPath === undefined || networkDescriptionPath === templatePath ? '[new file]' : networkDescriptionPath}{modified ? '*' : ''}
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
                        editorId='spikes-lang'
                        width={dimension.width}
                        height={dimension.height}
                        language={SPIKES_LANGUAGE_ID}
                        theme={theme}
                        customThemes={customThemes}
                        value={network}
                        options={editorOptions}
                        onChange={(value: string) => onChanged(value)}
                        editorDidMount={noop}
                    />
                </StackItem>
            </Stack>
        </div>
    )
}

/**
 * Returns the editor's theme that is mapped to the application's theme
 * @param name The name of the application's theme
 * @return The name of the editor's theme
 */
export function editorThemeFrom(name: string): string {
    switch (name) {
        case 'default':
        case 'light':
            return DefaultTheme.LIGHT;

        case 'dark':
            return DefaultTheme.DARK;

        default:
            return DefaultTheme.LIGHT;
    }
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
    network: state.networkDescription.description,
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
    onLoadTemplate: (path: string) => dispatch(loadNetworkDescriptionFromTemplate(path)),
    onLoadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    onSave: (path: string, description: string) => dispatch(persistNetworkDescription(path, description)),
});

const connectedNetworkEditor = connect(mapStateToProps, mapDispatchToProps)(NetworkEditor);

export default withRouter(connectedNetworkEditor);
