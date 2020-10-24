/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */
export const NETWORK_DESCRIPTION_LOADED = 'network-description-loaded';
export const NETWORK_DESCRIPTION_CHANGED = 'network-description-changed';
// export const NETWORK_DESCRIPTION_MODIFIED_STATE = 'network-description-modified-state';
// export const NETWORK_DESCRIPTION_PATH = 'network-description-path';
export const NETWORK_DESCRIPTION_SAVED = 'network-description-saved';

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

export interface NetworkDescriptionLoadedAction {
    type: typeof NETWORK_DESCRIPTION_LOADED;
    networkDescription: string;
    path?: string;
}

/**
 * Action when network description has changed
 */
export interface NetworkDescriptionUpdateAction {
    type: typeof NETWORK_DESCRIPTION_CHANGED;
    networkDescription: string;
}

/**
 * Action holding the modification state of the network description
 */
// export interface NetworkDescriptionModifiedAction {
//     type: typeof NETWORK_DESCRIPTION_MODIFIED_STATE;
//     modified: boolean;
// }

// export interface NetworkDescriptionPathAction {
//     type: typeof NETWORK_DESCRIPTION_PATH;
//     path: string;
// }

export  interface NetworkDescriptionSavedAction {
    type: typeof NETWORK_DESCRIPTION_SAVED;
    path: string;
}


export type NetworkDescriptionAction = NetworkDescriptionLoadedAction
    | NetworkDescriptionUpdateAction
    // | NetworkDescriptionModifiedAction
    // | NetworkDescriptionPathAction
    | NetworkDescriptionSavedAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */
export function loadedNetworkDescriptionFromTemplate(description: string): NetworkDescriptionLoadedAction {
    return {
        type: NETWORK_DESCRIPTION_LOADED,
        networkDescription: description
    }
}

export function loadedNetworkDescription(description: string, path: string): NetworkDescriptionLoadedAction {
    return {
        type: NETWORK_DESCRIPTION_LOADED,
        networkDescription: description,
        path: path
    }
}

export function updateNetworkDescription(description: string): NetworkDescriptionUpdateAction {
    return {
        type: NETWORK_DESCRIPTION_CHANGED,
        networkDescription: description
    }
}

// export function updateNetworkDescriptionModificationState(modified: boolean): NetworkDescriptionModifiedAction {
//     return {
//         type: NETWORK_DESCRIPTION_MODIFIED_STATE,
//         modified: modified
//     }
// }

// export function updateNetworkDescriptionPath(path: string): NetworkDescriptionPathAction {
//     return {
//         type: NETWORK_DESCRIPTION_PATH,
//         path: path
//     }
// }

export function networkDescriptionSaved(path: string): NetworkDescriptionSavedAction {
    return {
        type: NETWORK_DESCRIPTION_SAVED,
        path: path
    }
}