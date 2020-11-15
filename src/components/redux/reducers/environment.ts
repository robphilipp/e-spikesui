import {NetworkDescriptionState} from "./networkDescription";
import {ENVIRONMENT_CHANGED, ENVIRONMENT_LOADED, ENVIRONMENT_SAVED, EnvironmentAction} from "../actions/environment";

export interface EnvironmentState {
    // the code snippet that defines the environment and input signals and their
    // timing.
    codeSnippet?: string;
    // the original code-snippet, which is reset when the network is saved
    preSavedDescription?: string;
    // flag when the network description has been modified, which is reset when the
    // network is saved
    modified: boolean;
    // the path to the current network description. when undefined then hasn't been
    // save or loaded from file (i.e. a new network description)
    path?: string;
}

/**
 * Loads the initial network-description and sets the initial state
 * @return {NetworkDescriptionState}
 */
function initialState(): EnvironmentState {
    return {
        codeSnippet: undefined,
        modified: false,
        path: undefined,
        preSavedDescription: undefined
    }
}

export function environmentReducer(state: EnvironmentState = initialState(), action: EnvironmentAction): EnvironmentState {
    switch (action.type) {
        case ENVIRONMENT_LOADED:
            return {
                ...state,
                codeSnippet: action.result.codeSnippet,
                modified: false,
                path: action.result.path,
                preSavedDescription: action.result.codeSnippet
            }

        case ENVIRONMENT_CHANGED:
            return {
                ...state,
                codeSnippet: action.codeSnippet,
                modified: action.codeSnippet !== state.codeSnippet,
                preSavedDescription: state.preSavedDescription === undefined ? state.codeSnippet : state.preSavedDescription
            }

        case ENVIRONMENT_SAVED:
            return {
                ...state,
                modified: false,
                path: action.result.path,
                preSavedDescription: action.result.codeSnippet
            }

        default:
            return state;
    }
}