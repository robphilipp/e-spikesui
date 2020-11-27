/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
import {ResponseAction, successAction} from "./actions";
import {ThunkAction} from "redux-thunk";
import {readSimulationProject, saveSimulationProject as persistSimulationProject, SimulationProject} from "../../repos/simulationProjectRepo";

export const PROJECT_LOADED = 'project-loaded';
export const PROJECT_CHANGED = 'project-changed';
export const PROJECT_SAVED = 'project-saved';

/*
 |
 | Action definitions (for use by the reducers)
 |
 */
export type ProjectLoadedAction = ResponseAction<typeof PROJECT_LOADED, SimulationProjectResult>
export type ProjectSavedAction = ResponseAction<typeof PROJECT_SAVED, SimulationProjectResult>

export interface ProjectUpdatedAction {
    type: typeof PROJECT_CHANGED;
    project: SimulationProject;
}

export interface SimulationProjectResult {
    project: SimulationProject;
    path: string;
}

export type SimulationProjectAction = ProjectLoadedAction
    | ProjectUpdatedAction
    | ProjectSavedAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */
export function updateSimulationProject(project: SimulationProject): ProjectUpdatedAction {
    return {
        type: PROJECT_CHANGED,
        project: project,
    }
}

export function loadSimulationProject(path: string): ThunkAction<Promise<ProjectLoadedAction>, unknown, unknown, ProjectLoadedAction> {
    return dispatch => readSimulationProject(path)
        .then(project => dispatch(successAction(PROJECT_LOADED, {project, path})));
}

export function saveSimulationProject(path: string, project: SimulationProject): ThunkAction<Promise<ProjectSavedAction>, unknown, unknown, ProjectSavedAction> {
    return dispatch => persistSimulationProject(path, project)
        .then(() => dispatch(successAction(PROJECT_SAVED, {project, path})))
}