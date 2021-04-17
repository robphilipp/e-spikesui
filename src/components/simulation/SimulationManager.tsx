import {IconButton, MessageBarType, Pivot, PivotItem, Separator, Stack, StackItem, TooltipHost} from "@fluentui/react";
import {remote} from "electron";
import * as React from "react";
import {useEffect, useState} from "react";
import {connect} from "react-redux";
import {RouteComponentProps, useHistory, useParams, useRouteMatch, withRouter} from "react-router-dom";
import {ThunkDispatch} from "redux-thunk";
import {KeyboardShortcut, keyboardShortcutFor} from "../editors/keyboardShortcuts";
import {ApplicationAction} from "../redux/actions/actions";
import {
    loadSimulationProject,
    newSimulationProject,
    ProjectLoadedAction,
    ProjectSavedAction,
    saveSimulationProject
} from "../redux/actions/simulationProject";
import {AppState} from "../redux/reducers/root";
import {SimulationProject} from "../repos/simulationProjectRepo";
import {baseRouterPathFrom} from "../router/router";
import ProjectConfig from "./ProjectConfig";
import RunDeployManager from "./RunDeployManager";
import {loadNetworkDescriptionFrom, NetworkDescriptionLoadedAction} from "../redux/actions/networkDescription";
import {loadSensorsFrom, SensorsLoadedAction} from "../redux/actions/sensors";
import {useLoading} from "../common/useLoading";
import {deleteNetwork, DeleteNetworkAction} from "../redux/actions/networkEvent";
import {useTheme} from "../common/useTheme";
import {useMessage} from "../common/useMessage";

export const NEW_PROJECT_PATH = '**new**';
const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

enum TabName {
    PROJECT_CONFIG = 'simulation-project',
    DEPLOY_EXECUTE = 'simulation-execution'
}

interface OwnProps extends RouteComponentProps<never> {
    networkRouterPath: string;
    sensorRouterPath: string;
}

interface StateProps {
    projectPath?: string;
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;
    networkDescriptionPath?: string;
    sensorDescriptionPath?: string;
    modified: boolean;
    networkBuilt: boolean;
}

interface DispatchProps {
    loadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    loadSensorDescription: (path: string) => Promise<SensorsLoadedAction>;

    onCreate: () => void;
    onLoad: (path: string) => Promise<ProjectLoadedAction>;
    onSave: (path: string, project: SimulationProject) => Promise<ProjectSavedAction>;
    onSaveAs: (path: string, project: SimulationProject) => Promise<ProjectSavedAction>;

    onClearNetworkState: () => DeleteNetworkAction;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Manages the project settings and the simulation. The project settings included the network
 * description, the sensor description, the simulation name, time-factor, and duration.
 * @param props The props from the parent and redux
 * @return The simulation project editor and manager
 */
function SimulationManager(props: Props): JSX.Element {
    const {
        networkRouterPath,
        sensorRouterPath,
        projectPath,
        simulationName,
        timeFactor,
        simulationDuration,
        networkDescriptionPath,
        sensorDescriptionPath,
        modified,
        loadNetworkDescription,
        loadSensorDescription,
        onCreate,
        onLoad,
        onClearNetworkState,
        onSave,
    } = props;

    // when user refreshes when the router path is this simulation manager, then we want to load the same
    // project as before the refresh. to do this we use the path parameter holding the file path
    // to the project, and keep it consistent when loading a project
    const {simulationProjectPath} = useParams<{ [key: string]: string }>();
    const history = useHistory();
    const {path} = useRouteMatch();

    const {itheme} = useTheme()
    const {updateLoadingState} = useLoading();
    const {setMessage} = useMessage()

    const [baseRouterPath, setBaseRouterPath] = useState<string>(baseRouterPathFrom(path));

    // the selected tab (i.e. configuration or execution)
    const [selectedTab, setSelectedTab] = useState<string>(TabName.PROJECT_CONFIG);

    // when the simulation project path has changed, potentially load the project, and
    // load the associated network description and sensor code snippet
    useEffect(
        () => {
            const filePath = decodeURIComponent(simulationProjectPath);
            if (filePath !== 'undefined' && filePath !== NEW_PROJECT_PATH && !modified) {
                // updateLoadingState(true, "Loading simulation project")
                onLoad(filePath)
                    .then(action => {
                        Promise.all([
                            loadNetworkDescription(action.result.project.networkFilePath),
                            loadSensorDescription(action.result.project.sensorFilePath)
                        ]).catch(reason => setMessage(MessageBarType.error, <div>{reason.message}</div>))
                    })
                    .catch(reason => setMessage(MessageBarType.error, <div>{reason.message}</div>))
                    // .finally(() => updateLoadingState(false))
            }
        },
        [simulationProjectPath]
    );

    // when the path changes, we need to recalculate the base router path, even though
    // that really shouldn't change
    useEffect(
        () => {
            setBaseRouterPath(baseRouterPathFrom(path));
        },
        [path]
    )

    /**
     * Handles creating a new project with default settings.
     */
    function handleNewProject(): void {
        setSelectedTab(TabName.PROJECT_CONFIG);
        onCreate();
        history.push(`${baseRouterPath}/${encodeURIComponent(NEW_PROJECT_PATH)}`);
    }

    /**
     * Handle loading a sensor description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadProject(): void {
        updateLoadingState(true, "Loading simulation project")
        // todo if the network still exists (i.e. has been built) we need to prompt
        //      the user to delete the network before proceeding
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{name: 'spikes-sensor', extensions: ['spikes']}],
                    properties: ['openFile']
                })
            .then(response => {
                setSelectedTab(TabName.PROJECT_CONFIG);
                history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
                onClearNetworkState();
            })
            .catch(reason => setMessage(MessageBarType.error, <>
                <div><b>Unable to load simulation project file</b></div>
                <div>Response: {reason}</div>
            </>))
            .finally(() => updateLoadingState(false));
    }

    /**
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     */
    function handleSaveProject(): void {
        // if the state path is set and the path does not equal the template path, then the network
        // description is from an existing file, and we can just save it. otherwise, we need to up a
        // dialog so that the user can give the filename
        if (projectPath && projectPath !== NEW_PROJECT_PATH) {
            const project: SimulationProject = {
                simulationName: simulationName,
                timeFactor: timeFactor,
                simulationDuration: simulationDuration,
                sensorFilePath: sensorDescriptionPath,
                networkFilePath: networkDescriptionPath
            }

            onSave(projectPath, project).catch(reason => setMessage(MessageBarType.error, <div>{reason}</div>));
        } else {
            handleSaveProjectAs();
        }
    }

    /**
     * Handles saving the project under a new filename. Displays the save-as file dialog
     */
    function handleSaveProjectAs(): void {
        const project: SimulationProject = {
            simulationName: simulationName,
            timeFactor: timeFactor,
            simulationDuration: simulationDuration,
            sensorFilePath: sensorDescriptionPath,
            networkFilePath: networkDescriptionPath
        }

        remote.dialog
            .showSaveDialog(remote.getCurrentWindow(), {title: "Save As..."})
            .then(response => {
                if (response.filePath === "") {
                    return;
                }
                const path = response.filePath.endsWith('.spikes') ?
                    response.filePath :
                    `${response.filePath}.spikes`
                ;
                onSave(path, project)
                    .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(response.filePath)}`))
                    .catch(reason => setMessage(MessageBarType.error, <>
                        <div><b>Unable to save project to file.</b></div>
                        <div>Path: {projectPath}</div>
                        <div>Response: {reason}</div>
                    </>))
            });
    }

    /**
     * Handles keyboard events when the editor is focused
     * @param event The keyboard event
     */
    function handleKeyboardShortcut(event: React.KeyboardEvent<HTMLDivElement>): void {
        keyboardShortcutFor(event.nativeEvent).ifSome(shortcut => {
            switch (shortcut) {
                case KeyboardShortcut.NEW:
                    handleNewProject();
                    break;

                case KeyboardShortcut.SAVE: {
                    handleSaveProject();
                    break;
                }

                case KeyboardShortcut.SAVE_AS: {
                    handleSaveProjectAs();
                    break;
                }

                case KeyboardShortcut.LOAD:
                    handleLoadProject();
                    break;

                default:
                /* nothing to do */
            }
        });
    }

    /**
     * Create a button to create a new network
     * @return a button to create a new network
     */
    function newButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="New simulation project">
                <IconButton
                    iconProps={{iconName: 'add'}}
                    onClick={handleNewProject}
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
            <TooltipHost content="Save project settings">
                <IconButton
                    iconProps={{iconName: 'save'}}
                    onClick={handleSaveProject}
                    disabled={!canSave()}
                />
            </TooltipHost>
        </div>
    }

    /**
     * Creates a save button in the gutter when the contents have an associated file
     * path, and when they can be saved.
     * @return The save-button component
     */
    function saveAsButton(): JSX.Element {
        return <div style={{width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT}}>
            <TooltipHost content="Save project settings as new file">
                <IconButton
                    iconProps={{iconName: 'save-as'}}
                    onClick={handleSaveProjectAs}
                    // disabled={!canSave()}
                />
            </TooltipHost>
        </div>
    }

    /**
     * @return `true` if the simulation project can be saved; `false` otherwise
     */
    function canSave(): boolean {
        const validProject = networkDescriptionPath !== undefined &&
            sensorDescriptionPath != undefined &&
            simulationDuration > 0 &&
            timeFactor >= 1;
        return validProject && (modified || projectPath === NEW_PROJECT_PATH);
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
                    iconProps={{iconName: 'file-solid'}}
                    onClick={handleLoadProject}
                />
            </TooltipHost>
        </div>
    }

    return (
        <div onKeyDown={handleKeyboardShortcut} style={{height: '100%'}}>
            {/* {message || <span />} */}
            <div
                style={{
                    marginLeft: 30,
                    marginBottom: 8,
                    height: 15,
                    color: itheme.palette.themeSecondary
                }}
            >
                {projectPath === undefined || projectPath === NEW_PROJECT_PATH ? '[new file]' : projectPath}{modified ? '*' : ''}
            </div>
            {/*<div>*/}
                <Stack horizontal verticalFill={true}>
                    <StackItem>
                        {newButton()}
                        {loadButton()}
                        {saveButton()}
                        {saveAsButton()}
                        <Separator/>
                        {/*{compileButton()}*/}
                        {/*{runSensorSimulationButton()}*/}
                        {/*{stopSensorSimulationButton()}*/}
                        {/*{showSimulation && hideSimulationButton()}*/}
                    </StackItem>
                    <Stack tokens={{childrenGap: 10}} style={{marginLeft: 20}} grow verticalFill={true}>
                        <Pivot
                            aria-label="simulation-tabs"
                            selectedKey={selectedTab}
                            onLinkClick={item => setSelectedTab(item.props.itemKey)}
                            style={{height: '100%'}}
                            styles={{itemContainer: {height: '100%'}}}
                        >
                            <PivotItem
                                headerText="Project Config"
                                itemKey={TabName.PROJECT_CONFIG}
                            >
                                <ProjectConfig
                                    itheme={itheme}
                                    networkRouterPath={networkRouterPath}
                                    sensorRouterPath={sensorRouterPath}
                                />
                            </PivotItem>
                            <PivotItem
                                headerText="Deploy and Run"
                                itemKey={TabName.DEPLOY_EXECUTE}
                                style={{height: '100%'}}
                            >
                                <RunDeployManager
                                    itheme={itheme}
                                />
                            </PivotItem>
                        </Pivot>
                    </Stack>
                </Stack>
            {/*</div>*/}
        </div>
    );
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
    projectPath: state.simulationProject.projectPath,
    simulationName: state.simulationProject.name,
    timeFactor: state.simulationProject.timeFactor,
    simulationDuration: state.simulationProject.simulationDuration,
    networkDescriptionPath: state.simulationProject.networkDescriptionPath,
    sensorDescriptionPath: state.simulationProject.sensorDescriptionPath,
    modified: state.simulationProject.modified,
    networkBuilt: state.networkEvent.networkBuilt,
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    loadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    loadSensorDescription: (path: string) => dispatch(loadSensorsFrom(path)),

    onCreate: () => dispatch(newSimulationProject()),
    onLoad: (path: string) => dispatch(loadSimulationProject(path)),
    onSave: (path: string, project: SimulationProject) => dispatch(saveSimulationProject(path, project)),
    onSaveAs: (path: string, project: SimulationProject) => dispatch(saveSimulationProject(path, project)),

    onClearNetworkState: () => dispatch(deleteNetwork()),
});

const connectedSimulationManager = connect(mapStateToProps, mapDispatchToProps)(SimulationManager);
export default withRouter(connectedSimulationManager);