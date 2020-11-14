import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import MonacoEditor from "../editor/MonacoEditor";
import {defaultCustomThemes, DefaultTheme} from '../editor/themes';
import {SPIKES_LANGUAGE_ID} from '../language/spikes-language';
import {RouteComponentProps, useHistory, useLocation, useParams, withRouter} from "react-router-dom";
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
import {IconButton, ITheme, Stack, StackItem} from '@fluentui/react';
import {remote} from "electron";


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
    basePath: string;
    itheme: ITheme;
    theme?: string;
}

interface StateProps {
    network: string;
    modified: boolean;
    path?: string;
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
        path,
        basePath,
    } = props;

    const {networkDescriptionPath} = useParams<{[key: string]: string}>();
    const history = useHistory();

    const editorRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});

    // when component mounts, sets the initial dimension of the editor and registers to listen
    // to window resize events. when component unmounts, removes the window-resize event listener
    useEffect(
        () => {
            if (editorRef.current) {
                setDimension(editorDimensions());
            }

            // listen to resize events so that the editor width and height can be updated
            window.addEventListener('resize', () => handleWindowResize());

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', () => handleWindowResize());
            }
        },
        []
    )

    useEffect(
        () => {
            const filePath = decodeURIComponent(networkDescriptionPath);
            if (filePath !== path || filePath === '') {
                // todo handle success and failure
                onLoadNetworkDescription(filePath)
                    .then(() => console.log("loaded"))
            }
        },
        [networkDescriptionPath]
    )

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
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     */
    function handleSave(): void {
        const save = (path: string, desc: string) => onSave(path, desc);
        // const save = (path: string, desc: string) => saveNetworkDescription(path, desc).ifRight(() => onSaved(path));
        if (path && path !== templatePath) {
            // todo handle success and error
            save(path, network).then(() => console.log('saved'));
        } else {
            remote.dialog
                .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
                .then(retVal => save(retVal.filePath, network));
        }

    }

    /**
     * Create a button to create a new network
     * @return a button to create a new network
     */
    function newButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <IconButton
                iconProps={{iconName: 'add'}}
                onClick={() => onLoadTemplate(templatePath).then(() => history.push(`${basePath}/${templatePath}`))}
            />
        </div>
    }

    /**
     * Creates a save button in the gutter when the contents have an associated file
     * path, and when they can be saved.
     * @return The save-button component
     */
    function saveButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <IconButton
                iconProps={{iconName: 'save'}}
                onClick={() => handleSave()}
                disabled={!(modified || path === templatePath)}
            />
        </div>
    }

    /**
     * Creates a build button when the network description is saved and can be used to
     * build a network.
     * @return The build-button component
     */
    function buildButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <IconButton
                iconProps={{iconName: 'homegroup'}}
                disabled={modified || network === undefined || network.length < 31}
            />
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
                        editorDidMount={emptyFunction}
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
 * @param ownProps The current properties of the `App` component
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    network: state.networkDescription.description,
    modified: state.networkDescription.modified,
    path: state.networkDescription.path,
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
