/**
 * Holds the network description state
 */
import {
    NETWORK_DESCRIPTION_CHANGED, NETWORK_DESCRIPTION_LOADED,
    NETWORK_DESCRIPTION_SAVED,
    NetworkDescriptionAction
} from "../actions/networkDescription";

/**
 * The network description state tracks the current network description, the pre-saved
 * original network description, the current path to which the network has been saved,
 * and whether the network description has been modified.
 */
export interface NetworkDescriptionState {
    // the current network description
    description?: string;
    // the original network description, which is reset when the network is saved
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
function initialState(): NetworkDescriptionState {
    return {
        description: undefined,
        modified: false,
        path: undefined,
        preSavedDescription: undefined
    }
}

/**
 * Reducer function that accepts the current state and action, and for change theme actions, updates the
 * state with the new theme and returns the updated state.
 * @param {NetworkDescriptionState} state The current state of the theme
 * @param {NetworkDescriptionAction} action The action holding the new state information
 * @return {NetworkDescriptionState} the updated state
 */
export function networkDescriptionReducer(
    state: NetworkDescriptionState = initialState(),
    action: NetworkDescriptionAction
): NetworkDescriptionState {

    switch (action.type) {
        case NETWORK_DESCRIPTION_LOADED:
            return {
                description: action.networkDescription,
                modified: false,
                preSavedDescription: action.networkDescription,
                path: action.path
            }

        case NETWORK_DESCRIPTION_CHANGED:
            return {
                ...state,
                description: action.networkDescription,
                modified: action.networkDescription !== state.preSavedDescription,
                preSavedDescription: state.preSavedDescription === undefined ? state.description : state.preSavedDescription
            }

        case NETWORK_DESCRIPTION_SAVED:
            return {
                ...state,
                modified: false,
                preSavedDescription: state.description,
                path: action.path
            }

        default:
            return state;
    }
}