/*
|
| Action names (for use by actions, redux action creators, and reducers)
|
*/

import {PerspectiveCamera, Renderer} from "three";
import {Option, Vector} from "prelude-ts";
import {SceneInfo} from "../../visualization/basethree/useScenes";

export const AXES_VISIBILITY_CHANGED = "network-visualization-axis-visibility-changed";
export const GRID_VISIBILITY_CHANGED = "network-visualization-grid-visibility-changed";
export const CAMERA_UPDATED = "network-visualization-camera-updated";
export const RENDERER_UPDATED = "network-visualization-renderer-updated";
export const SCENES_UPDATED = "network-visualization-scenes-updates";

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

/**
 * An action representing the change in axes visibility of network visualization
 */
export interface NetworkVisualizationAxesChangeAction {
    type: typeof AXES_VISIBILITY_CHANGED;
    visible: boolean;
}

/**
 * An action representing the change in grid visibility of the network visualization
 */
export interface NetworkVisualizationGridChangeAction {
    type: typeof GRID_VISIBILITY_CHANGED;
    visible: boolean;
}

/**
 * An action representing the change of the camera used in the simulation. Note this isn't
 * a change in the camera properties (i.e. location), but rather in the actual camera.
 */
export interface NetworkVisualizationCameraUpdateAction {
    type: typeof CAMERA_UPDATED;
    camera: Option<PerspectiveCamera>;
}

/**
 * An action representing the change of the renderer used in the simulation. Note this isn't
 * a change in the renderer properties (i.e. canvas, camera), but rather in the actual renderer.
 */
export interface NetworkVisualizationRendererUpdateAction {
    type: typeof RENDERER_UPDATED;
    renderer: Option<Renderer>;
}

/**
 * An action representing the change the scenes in the simulation. Note that this isn't a
 * change in the scenes' properties, but rather the adding or removing of a scene.
 */
export interface NetworkVisualizationScenesUpdateAction {
    type: typeof SCENES_UPDATED;
    scenes: Option<Vector<SceneInfo>>;
}

export type NetworkVisualizationAction = NetworkVisualizationAxesChangeAction |
    NetworkVisualizationGridChangeAction |
    NetworkVisualizationCameraUpdateAction |
    NetworkVisualizationRendererUpdateAction |
    NetworkVisualizationScenesUpdateAction
;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

/**
 * Action creator that creates an action to represent the visibility of the network-visualization's axes
 * @param {boolean} visible `true` if the network visualization axes are visible; `false` otherwise
 * @return {NetworkVisualizationAxesChangeAction} The action representing the change in axes visibility 
 * of network visualization
 */
export function axesVisibilityChanged(visible: boolean): NetworkVisualizationAxesChangeAction {
    return ({
        type: AXES_VISIBILITY_CHANGED,
        visible: visible
    });
}

/**
 * Action creator that creates an action to represent the visibility of the network-visualization's grid
 * @param {boolean} visible `true` if the network visualization grid are visible; `false` otherwise
 * @return {NetworkVisualizationGridChangeAction} The action representing the change in grid visibility
 * of network visualization
 */
export function gridVisibilityChanged(visible: boolean): NetworkVisualizationGridChangeAction {
    return ({
        type: GRID_VISIBILITY_CHANGED,
        visible: visible
    });
}

/**
 * Action creator that creates an action that the camera has be changed.
 * @param {PerspectiveCamera} camera The camera for viewing the three-js scene
 * @return {NetworkVisualizationCameraUpdateAction} The action that the camera has be changed.
 */
export function cameraUpdated(camera: PerspectiveCamera): NetworkVisualizationCameraUpdateAction {
    return ({
        type: CAMERA_UPDATED,
        camera: Option.ofNullable(camera)
    });
}

/**
 * Action creator that creates an action that the renderer has been changed.
 * @param {Renderer} renderer The three-js renderer that renders the scenes.
 * @return {NetworkVisualizationRendererUpdateAction} The action that the renderer has been changed.
 */
export function rendererUpdated(renderer: Renderer): NetworkVisualizationRendererUpdateAction {
    return ({
        type: RENDERER_UPDATED,
        renderer: Option.ofNullable(renderer)
    });
}

/**
 * Action creator that creates an action that the scenes have changed (i.e. a scene has been added or removed)
 * @param {Vector<SceneInfo>} scenes The list of scene information
 * @return {NetworkVisualizationScenesUpdateAction} The action that the scenes have been changed.
 */
export function scenesUpdated(scenes: Vector<SceneInfo>): NetworkVisualizationScenesUpdateAction {
    return ({
        type: SCENES_UPDATED,
        scenes: Option.ofNullable(scenes)
    });
}