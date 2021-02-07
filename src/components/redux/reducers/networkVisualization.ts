import {
    AXES_VISIBILITY_CHANGED,
    CAMERA_UPDATED,
    GRID_VISIBILITY_CHANGED,
    RENDERER_UPDATED,
    SCENES_UPDATED,
} from "../actions/networkVisualization";
import {ApplicationAction} from "../actions/actions";
import {SceneInfo} from "../../visualization/basethree/useScenes";
import {PerspectiveCamera, Renderer} from "three";
import {Option, Vector} from "prelude-ts";
import {NETWORK_DELETED, NETWORK_DESCRIPTION_CHANGED} from "../actions/networkManagement";

/*
 |
 | NETWORK VISUALIZATION CHANGES
 |
 */

interface NetworkVisualizationState {
    axesVisible: boolean;
    gridVisible: boolean;
    camera: Option<PerspectiveCamera>;
    renderer: Option<Renderer>;
    scenes: Option<Vector<SceneInfo>>;
}

const initialVisState: NetworkVisualizationState = {
    axesVisible: false,
    gridVisible: false,
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
    switch(action.type) {
        case AXES_VISIBILITY_CHANGED:
            return {
                ...state,
                axesVisible: action.visible
            };

        case GRID_VISIBILITY_CHANGED:
            return {
                ...state,
                gridVisible: action.visible
            };

        case CAMERA_UPDATED:
            return {
                ...state,
                camera: action.camera
            };

        case RENDERER_UPDATED:
            return {
                ...state,
                renderer: action.renderer
            };

        case SCENES_UPDATED:
            return {
                ...state,
                scenes: action.scenes
            };

        case NETWORK_DELETED:
        case NETWORK_DESCRIPTION_CHANGED:
            return {
                ...state,
                camera: Option.none(),
                renderer: Option.none(),
                scenes: Option.none()
            };

        default:
            return state;
    }
}