import {SENSORS_CHANGED, SENSORS_LOADED, SENSORS_SAVED, SensorsAction} from "../actions/sensors";

export interface SensorsState {
    // the code snippet that defines the environment and input signals and their
    // timing.
    codeSnippet?: string;
    // the original code-snippet, which is reset when the network is saved
    preSavedCodeSnippet?: string;
    // flag when the sensor description has been modified, which is reset when the
    // network is saved
    modified: boolean;
    // the path to the current sensor description. when undefined then hasn't been
    // save or loaded from file (i.e. a new network description)
    path?: string;
}

/**
 * Creates the initial sensors state
 * @return The initial sensor state
 */
function initialState(): SensorsState {
    return {
        codeSnippet: undefined,
        modified: false,
        path: undefined,
        preSavedCodeSnippet: undefined
    }
}

/**
 * Reducer takes the current sensor state and an action and returns the new sensor state.
 * @param state The current sensor state (optional and defaults to the initial state)
 * @param action The sensor action based on which to update the state
 */
export function sensorsReducer(state: SensorsState = initialState(), action: SensorsAction): SensorsState {
    switch (action.type) {
        case SENSORS_LOADED:
            return {
                ...state,
                codeSnippet: action.result.codeSnippet,
                modified: false,
                path: action.result.path,
                preSavedCodeSnippet: action.result.codeSnippet
            }

        case SENSORS_CHANGED:
            return {
                ...state,
                modified: action.codeSnippet !== state.preSavedCodeSnippet,
                codeSnippet: action.codeSnippet,
                preSavedCodeSnippet: state.preSavedCodeSnippet === undefined ? state.codeSnippet : state.preSavedCodeSnippet
            }

        case SENSORS_SAVED:
            return {
                ...state,
                modified: false,
                path: action.result.path,
                preSavedCodeSnippet: action.result.codeSnippet
            }

        default:
            return state;
    }
}