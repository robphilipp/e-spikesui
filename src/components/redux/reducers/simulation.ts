// import {
//     NETWORK_DESCRIPTION_CHANGED,
//     NETWORK_DESCRIPTION_LOADED, NETWORK_DESCRIPTION_SAVED,
//     NetworkDescriptionAction
// } from "../actions/networkDescription";
// import {NetworkDescriptionState} from "./networkDescription";
//
// export interface SimulationState {
//     projectPath?: string;
//     name?: string;
//     timeFactor: number;
//     simulationDuration: number;
//     networkDescriptionPath?: string;
//     sensorDescriptionPath?: string;
// }
//
// /**
//  * Loads the initial network-description and sets the initial state
//  * @return {NetworkDescriptionState}
//  */
// function initialState(): SimulationState {
//     return {
//         description: undefined,
//         modified: false,
//         path: undefined,
//         preSavedDescription: undefined
//     }
// }
//
// /**
//  * Reducer function that accepts the current state and an action, and returns the updated state.
//  * @param state The current state of the simulation project
//  * @param action The action holding the new state information
//  * @return the updated state
//  */
// export function simulationReducer(
//     state: SimulationState = initialState(),
//     action: SimulationAction
// ): SimulationState {
//
//     switch (action.type) {
//         // case NETWORK_DESCRIPTION_LOADED:
//         //     return {
//         //         ...state,
//         //         description: action.result.description,
//         //         modified: false,
//         //         path: action.result.path,
//         //         preSavedDescription: action.result.description
//         //     }
//         //
//         // case NETWORK_DESCRIPTION_CHANGED:
//         //     return {
//         //         ...state,
//         //         description: action.networkDescription,
//         //         modified: action.networkDescription !== state.preSavedDescription,
//         //         preSavedDescription: state.preSavedDescription === undefined ? state.description : state.preSavedDescription
//         //     }
//         //
//         // case NETWORK_DESCRIPTION_SAVED:
//         //     return {
//         //         ...state,
//         //         modified: false,
//         //         path: action.result.path,
//         //         preSavedDescription: action.result.description
//         //     };
//
//         default:
//             return state;
//     }
// }