import {PROJECT_CHANGED, PROJECT_LOADED, PROJECT_SAVED, SimulationProjectAction} from "../actions/simulationProject";

export interface SimulationProjectState {
    projectPath?: string;
    name?: string;
    timeFactor: number;
    simulationDuration: number;
    networkDescriptionPath?: string;
    sensorDescriptionPath?: string;
    modified: boolean;
}

/**
 * Loads the initial network-description and sets the initial state
 * @return {NetworkDescriptionState}
 */
function initialState(): SimulationProjectState {
    return {
        projectPath: undefined,
        name: undefined,
        timeFactor: 1,
        simulationDuration: 50,
        networkDescriptionPath: undefined,
        sensorDescriptionPath: undefined,
        modified: false,
    }
}

/**
 * Reducer function that accepts the current state and an action, and returns the updated state.
 * @param state The current state of the simulation project
 * @param action The action holding the new state information
 * @return the updated state
 */
export function simulationProjectReducer(
    state: SimulationProjectState = initialState(),
    action: SimulationProjectAction
): SimulationProjectState {

    switch (action.type) {
        case PROJECT_LOADED:
            return {
                ...state,
                projectPath: action.result.path,
                name: action.result.project.simulationName,
                timeFactor: action.result.project.timeFactor,
                simulationDuration: action.result.project.simulationDuration,
                networkDescriptionPath: action.result.project.networkFilePath,
                sensorDescriptionPath: action.result.project.sensorFilePath,
                modified: false,
            }

        case PROJECT_CHANGED:
            return {
                ...state,
                name: action.project.simulationName,
                timeFactor: action.project.timeFactor,
                simulationDuration: action.project.simulationDuration,
                networkDescriptionPath: action.project.networkFilePath,
                sensorDescriptionPath: action.project.sensorFilePath,
                modified: true,
            }

        case PROJECT_SAVED:
            return {
                ...state,
                projectPath: action.result.path,
                name: action.result.project.simulationName,
                timeFactor: action.result.project.timeFactor,
                simulationDuration: action.result.project.simulationDuration,
                networkDescriptionPath: action.result.project.networkFilePath,
                sensorDescriptionPath: action.result.project.sensorFilePath,
                modified: false,
            }

        default:
            return state;
    }
}