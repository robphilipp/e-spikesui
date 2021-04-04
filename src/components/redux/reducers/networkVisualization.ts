import {
    AXES_VISIBILITY_CHANGED,
    CAMERA_UPDATED,
    GRID_VISIBILITY_CHANGED, NetworkVisualizationAction,
    RENDERER_UPDATED,
    SCENES_UPDATED,
} from "../actions/networkVisualization";
import {ApplicationAction} from "../actions/actions";
import {PerspectiveCamera, Renderer} from "three";
import {HashMap, Option, Vector} from "prelude-ts";
import {NETWORK_DELETED, NETWORK_DESCRIPTION_CHANGED} from "../actions/networkManagement";
import {SceneInfo} from "../../visualization/basethree/ThreeProvider";

/*
 |
 | NETWORK VISUALIZATION CHANGES
 |
 */

// there are several network visualizations in the application, and
// each of their state is stored in the map. the string is the
// visualization ID, specified in each instance of the <Network> component,
// and should be unique in the application.
interface NetworkVisualizationState {
    states: HashMap<string, NetVisualizationState>;
}

const initialVisState: NetworkVisualizationState = {
    states: HashMap.empty()
};

interface NetVisualizationState {
    axesVisible: boolean;
    gridVisible: boolean;
    camera: Option<PerspectiveCamera>;
    renderer: Option<Renderer>;
    scenes: Option<Array<SceneInfo>>;
    // scenes: Option<Vector<SceneInfo>>;
}

export const initialNetVisState: NetVisualizationState = {
    axesVisible: true,
    gridVisible: true,
    camera: Option.none(),
    renderer: Option.none(),
    scenes: Option.none(),
};

/**
 * Updates the specified (current) state based on the action, and returns a new state
 * @param {NetworkVisualizationState} state The current state of the network visualization
 * @param {ApplicationAction} action The action that triggered the state update
 * @return {NetworkVisualizationState} The new network visualization state
 */
export function networkVisualizationReducer(state: NetworkVisualizationState = initialVisState,
                                            action: ApplicationAction): NetworkVisualizationState {
    const id = (action as NetworkVisualizationAction).id;
    const vizState = state.states.get(id).getOrElse(initialNetVisState);
    switch(action.type) {
        case AXES_VISIBILITY_CHANGED:
            return {
                states: state.states.put(id, {...vizState, axesVisible: action.visible})
            }

        case GRID_VISIBILITY_CHANGED:
            return {
                states: state.states.put(id, {...vizState, gridVisible: action.visible})
            }

        case CAMERA_UPDATED:
            return {
                states: state.states.put(id, {...vizState, camera: action.camera})
            }

        case RENDERER_UPDATED:
            return {
                states: state.states.put(id, {...vizState, renderer: action.renderer})
            }

        case SCENES_UPDATED:
            return {
                states: state.states.put(id, {...vizState, scenes: action.scenes})
            }

        case NETWORK_DELETED:
        case NETWORK_DESCRIPTION_CHANGED:
            return {
                states: state.states.put(id, {
                    ...vizState,
                    camera: Option.none(),
                    renderer: Option.none(),
                    scenes: Option.none()
                })
            }

        default:
            return state;
    }
}