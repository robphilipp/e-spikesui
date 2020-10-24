import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import MonacoEditor from "../editor/MonacoEditor";
import {defaultCustomThemes, DefaultTheme} from '../editor/themes';
import {SPIKES_LANGUAGE_ID} from '../language/spikes-language';
import {RouteComponentProps, withRouter} from "react-router-dom";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {updateNetworkDescription} from '../redux/actions/networkDescription';
import {connect} from "react-redux";
import {IconButton, ITheme, Stack, StackItem} from '@fluentui/react';


const customThemes = defaultCustomThemes();
const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};
const emptyFunction = () => {
    return;
}

const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 25;

interface Dimension {
    height: number;
    width: number;
}

interface StateProps {
    networkDescription: string;
    modified: boolean;
    path?: string;
}

interface DispatchProps {
    onDescriptionChanged: (description: string) => void;
}

interface OwnProps  extends RouteComponentProps<never> {
    itheme: ITheme;
    theme?: string;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Wrapper for the monaco editor that manages resizing and theme updates
 * @param {Props} props The properties holding the current theme
 * @return {JSX.Element} The network editor
 * @constructor
 */
function NetworkEditor(props: Props): JSX.Element {
    const {
        theme = DefaultTheme.DARK,
        networkDescription,
        onDescriptionChanged,
        modified,
        path
    } = props;

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

    /**
     * calculates the editors dimensions based on the `<div>`'s width and height
     * @return {Dimension} The dimension of the editor
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

    function saveButton(): JSX.Element {
        if (modified) {
            return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
                <IconButton iconProps={{iconName: 'save'}}/>
            </div>
        }
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}/>
    }

    function buildButton(): JSX.Element {
        if (!modified && (networkDescription && networkDescription.length > 31)) {
            return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
                <IconButton iconProps={{iconName: 'homegroup'}}/>
            </div>
        }
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}/>
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
                {path || '[new file]'}
            </div>
            <Stack horizontal>
                <StackItem>
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
                        value={networkDescription}
                        options={editorOptions}
                        onChange={(value: string) => onDescriptionChanged(value)}
                        editorDidMount={emptyFunction}
                    />
                </StackItem>
            </Stack>
        </div>
    )
}

/**
 * Returns the editor's theme that is mapped to the application's theme
 * @param {string} name The name of the application's theme
 * @return {string} The name of the editor's theme
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
    ...ownProps,
    networkDescription: state.networkDescription.description,
    modified: state.networkDescription.modified,
    path: state.networkDescription.path
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
    onDescriptionChanged: (description: string) => dispatch(updateNetworkDescription(description))
});

const connectedNetworkEditor = connect(mapStateToProps, mapDispatchToProps)(NetworkEditor);

export default withRouter(connectedNetworkEditor);
