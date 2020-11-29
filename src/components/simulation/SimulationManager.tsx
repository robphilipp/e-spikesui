import * as React from "react";
import { AppState } from "../redux/reducers/root";
import { ThunkDispatch } from "redux-thunk";
import { ApplicationAction } from "../redux/actions/actions";
import { connect } from "react-redux";
import { RouteComponentProps, useHistory, useParams, withRouter } from "react-router-dom";
import { SimulationProject } from "../repos/simulationProjectRepo";
import {
    loadSimulationProject, newSimulationProject, ProjectLoadedAction, ProjectSavedAction, ProjectUpdatedAction,
    saveSimulationProject, SimulationProjectResult,
    updateSimulationProject
} from "../redux/actions/simulationProject";
import {
    ActionButton,
    DefaultButton,
    FontWeights,
    Icon,
    IconButton,
    IIconStyles,
    IStackTokens,
    ITextStyles,
    ITheme,
    Link,
    MessageBar,
    MessageBarType,
    PrimaryButton,
    Separator,
    Stack,
    StackItem,
    Text,
    TooltipHost
} from "@fluentui/react";
import { Card, ICardTokens, ICardSectionStyles, ICardSectionTokens } from '@uifabric/react-cards';
import { DefaultTheme } from "../editors/themes";
import { remote } from "electron";
import { useEffect, useState } from "react";

export const NEW_PROJECT_PATH = '**new**';
const SIDEBAR_WIDTH = 32;
const SIDEBAR_ELEMENT_HEIGHT = 32;

const siteTextStyles: ITextStyles = {
    root: {
        color: '#025F52',
        fontWeight: FontWeights.semibold,
    },
};
const descriptionTextStyles: ITextStyles = {
    root: {
        color: '#333333',
        fontWeight: FontWeights.regular,
    },
};
const helpfulTextStyles: ITextStyles = {
    root: {
        color: '#333333',
        fontWeight: FontWeights.regular,
    },
};
const iconStyles: IIconStyles = {
    root: {
        color: '#0078D4',
        fontSize: 16,
        fontWeight: FontWeights.regular,
    },
};
const footerCardSectionStyles: ICardSectionStyles = {
    root: {
        alignSelf: 'stretch',
        borderLeft: '1px solid #F3F2F1',
    },
};
const sectionStackTokens: IStackTokens = { childrenGap: 20 };
const cardTokens: ICardTokens = { childrenMargin: 12 };
const footerCardSectionTokens: ICardSectionTokens = { padding: '0px 0px 0px 12px' };


interface OwnProps extends RouteComponentProps<never> {
    baseRouterPath: string;
    itheme: ITheme;
    theme?: string;
}

interface StateProps {
    projectPath?: string;
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;
    networkDescriptionPath?: string;
    sensorDescriptionPath?: string;
    modified: boolean;
}

interface DispatchProps {
    onCreate: () => void;
    onLoad: (path: string) => Promise<ProjectLoadedAction>;
    onChange: (project: SimulationProject) => void;
    onSave: (path: string, project: SimulationProject) => Promise<ProjectSavedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

function SimulationManager(props: Props): JSX.Element {
    const {
        theme = DefaultTheme.DARK,
        itheme,
        baseRouterPath,
        projectPath,
        simulationName,
        timeFactor,
        simulationDuration,
        networkDescriptionPath,
        sensorDescriptionPath,
        modified,
        onCreate,
        onLoad,
        onChange,
        onSave,
    } = props;

    // when user refreshes when the router path is this simulation manager, then we want to load the same
    // project as before the refresh. to do this we use the path parameter holding the file path
    // to the project, and keep it consistent when loading a project
    const { simulationProjectPath } = useParams<{ [key: string]: string }>();
    const history = useHistory();

    const [message, setMessage] = useState<JSX.Element>();

    // when the environment code-snippet file path from the router has changed, and is
    // not equal to the current state path, or is empty, then load the environment code-snippet,
    // or a template
    useEffect(
        () => {
            const filePath = decodeURIComponent(simulationProjectPath);
            if (filePath !== 'undefined' && filePath !== NEW_PROJECT_PATH) {
                onLoad(filePath)
                    .then(() => console.log("loaded"))
                    .catch(reason => setMessage(errorMessage(reason.message)))
            }
        },
        [simulationProjectPath]
    );

    function handleNewProject(): void {
        onCreate();
    }

    function handleLoadSensor(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-sensor', extensions: ['sensor'] }],
                    properties: ['openFile']
                })
            .then(response => {
                // history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Handle loading a sensor description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadNetwork(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-network', extensions: ['network'] }],
                    properties: ['openFile']
                })
            .then(response => {
                // history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Handle loading a sensor description from file by presenting the user with an open-file
     * dialog.
     */
    function handleLoadProject(): void {
        remote.dialog
            .showOpenDialog(
                remote.getCurrentWindow(),
                {
                    title: 'Open...',
                    filters: [{ name: 'spikes-sensor', extensions: ['sensor'] }],
                    properties: ['openFile']
                })
            .then(response => {
                // history.push(`${baseRouterPath}/${encodeURIComponent(response.filePaths[0])}`);
            })
    }

    /**
     * Handles saving the file when the path exists, otherwise opens a save-file dialog to allow
     * the user to set the path. Sends redux action when file has been saved.
     */
    function handleSaveProject(): void {
        const project: SimulationProject = {
            simulationName: simulationName,
            timeFactor: timeFactor,
            simulationDuration: simulationDuration,
            sensorFilePath: sensorDescriptionPath,
            networkFilePath: networkDescriptionPath
        }

        // if the state path is set and the path does not equal the template path, then the network
        // description is from an existing file, and we can just save it. otherwise, we need to up a
        // dialog so that the user can give the filename
        if (projectPath && projectPath !== NEW_PROJECT_PATH) {
            // todo handle success and error
            onSave(projectPath, project)
                .then(() => console.log('saved'));
        } else {
            remote.dialog
                .showSaveDialog(remote.getCurrentWindow(), { title: "Save As..." })
                .then(response => onSave(response.filePath, project)
                    .then(() => history.push(`${baseRouterPath}/${encodeURIComponent(response.filePath)}`))
                );
        }
    }

    function handleEditNetworkDescription(): void {
        
    }

    function handleEditSensorDescription(): void {

    }

    /**
     * Create a button to create a new network
     * @return a button to create a new network
     */
    function newButton(): JSX.Element {
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="New simulation project">
                <IconButton
                    iconProps={{ iconName: 'add' }}
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
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="Save simulation project">
                <IconButton
                    iconProps={{ iconName: 'save' }}
                    onClick={handleSaveProject}
                    disabled={!canSave()}
                />
            </TooltipHost>
        </div>
    }

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
        return <div style={{ width: SIDEBAR_WIDTH, height: SIDEBAR_ELEMENT_HEIGHT }}>
            <TooltipHost content="Load network environment">
                <IconButton
                    iconProps={{ iconName: 'upload' }}
                    onClick={handleLoadProject}
                />
            </TooltipHost>
        </div>
    }

    function networkDescriptionCard(): JSX.Element {
        return (
            <Card aria-label="Network Description File" horizontal tokens={{childrenMargin: 12}}>
            <Card.Item align="center" grow>
                <Icon 
                    iconName='homegroup'
                    style={{color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16}}
                />
            </Card.Item>
            <Card.Section>
                <Text 
                    variant="medium" 
                    style={{color: itheme.palette.themePrimary, fontWeight: 700}}
                >
                    Network Description
                </Text>
                <Text 
                    variant="medium" 
                    style={{color: itheme.palette.neutralPrimary, fontWeight: 400}}
                >
                    {networkDescriptionPath || '(none selected'}
                </Text>
                <Text 
                    variant="small" 
                    style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                >
                    Select the network description file
                </Text>
            </Card.Section>
            <Card.Section styles={{root: {alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}`}}} tokens={{padding: '0px 0px 0px 12px'}}>
                <IconButton 
                    iconProps={{iconName: "edit"}} 
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleEditNetworkDescription}
                />
                <IconButton 
                    iconProps={{iconName: "file"}} 
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleLoadNetwork}
                />
            </Card.Section>
        </Card>
        )
    }

    function sensorDescriptionCard(): JSX.Element {
        return (
            <Card aria-label="Network Description File" horizontal tokens={{childrenMargin: 12}}>
            <Card.Item align="center" grow>
                <Icon 
                    iconName='environment'
                    style={{color: itheme.palette.themePrimary, fontWeight: 400, fontSize: 16}}
                />
            </Card.Item>
            <Card.Section>
                <Text 
                    variant="medium" 
                    style={{color: itheme.palette.themePrimary, fontWeight: 700}}
                >
                    Sensor Description
                </Text>
                <Text 
                    variant="medium" 
                    style={{color: itheme.palette.neutralPrimary, fontWeight: 400}}
                >
                    {sensorDescriptionPath || '(none selected'}
                </Text>
                <Text 
                    variant="small" 
                    style={{color: itheme.palette.themeSecondary, fontWeight: 400}}
                >
                    Select the sensor description file
                </Text>
            </Card.Section>
            <Card.Section 
                styles={{root: {alignSelf: 'stretch', borderLeft: `1px solid ${itheme.palette.neutralLighter}`}}} 
                tokens={{padding: '0px 0px 0px 12px'}}
            >
                <IconButton 
                    iconProps={{iconName: "edit"}} 
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleEditSensorDescription}
                />
                <IconButton 
                    iconProps={{iconName: "file"}} 
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleLoadSensor}
                />
            </Card.Section>
        </Card>
        )
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

    return <div>
        {message || <span />}
        <div
            style={{
                marginLeft: 30,
                marginBottom: 8,
                height: 15,
                color: props.itheme.palette.themeSecondary
            }}
        >
            {projectPath === undefined || projectPath === NEW_PROJECT_PATH ? '[new file]' : projectPath}{modified ? '*' : ''}
        </div>
        <div>
            <Stack horizontal>
                <StackItem>
                    {newButton()}
                    {saveButton()}
                    {loadButton()}
                    <Separator />
                    {/*{compileButton()}*/}
                    {/*{runSensorSimulationButton()}*/}
                    {/*{stopSensorSimulationButton()}*/}
                    {/*{showSimulation && hideSimulationButton()}*/}
                </StackItem>
                <Stack tokens={{ childrenGap: 10, padding: 20 }}>
                    {networkDescriptionCard()}
                    {sensorDescriptionCard()}
                </Stack>
            </Stack>
        </div>
    </div>;
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
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onCreate: () => dispatch(newSimulationProject()),
    onChange: (project: SimulationProject) => dispatch(updateSimulationProject(project)),
    onLoad: (path: string) => dispatch(loadSimulationProject(path)),
    onSave: (path: string, project: SimulationProject) => dispatch(saveSimulationProject(path, project)),
});

const connectedSimulationManager = connect(mapStateToProps, mapDispatchToProps)(SimulationManager);
export default withRouter(connectedSimulationManager);