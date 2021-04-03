import {Object3D, Scene} from "three";
import {Option, Vector} from "prelude-ts";
import {createContext, useContext, useEffect} from "react";

function noop(): void {/* empty */}

/**
 * The scene information.
 */
export interface SceneInfo {
    readonly name: string;
    readonly scene: Scene;
    visible: boolean;
}

/**
 * The scenes context holding the list of scenes and accessor function
 */
export interface ScenesContext {
    sceneFor: (sceneId: string) => Option<SceneInfo>;
    addToScene: <E extends Object3D>(sceneId: string, entity: E) => [string, E];
    visibility: (sceneId: string, visible: boolean) => void;
    isVisible: (sceneId: string) => boolean;
    scenes: Array<SceneInfo>;
    // scenes: Vector<SceneInfo>;
    clearScenes: () => void
}

// the default, initial settings for the scene context
export const emptySceneContext: ScenesContext = {
    // (scenedId: string) => Option,
    sceneFor: () => Option.none(),
    addToScene: <E extends Object3D>(sceneId: string, entity: E) => [sceneId, entity],
    // (sceneId: string, visible: boolean) => void,
    visibility: noop,
    // (sceneId: string) => boolean,
    isVisible: () => false,
    // scenes: Vector.empty()
    scenes: [],
    clearScenes: noop,
};

/**
 * Three react context holding the three-scene context
 * @type {React.Context<ScenesContext>} The react context holding the three scenes
 */
export const SceneContext = createContext<ScenesContext>(emptySceneContext);

/**
 * React-hook for managing the ThreeJs scene objects. Holds on to a list of `SceneInfo`
 * objects and a method for access in the scenes by their ID. These are wrapped into the
 * `SceneContext`. When mounted, the function component calls the specified scene supplier
 * and sets the returned scenes into the context. Note that the scenes are rendered in the
 * order in which they are supplied.
 * @param {() => Vector<SceneInfo>} scenesSupplier The supplier of the `SceneInfo` objects.
 * @param {(scenes: ScenesContext) => void} destroy The optional destroy function
 * @return {ScenesContext} The scene context holding the scenes and an accessor function.
 */
export function useScenes(
    scenesSupplier: () => Array<SceneInfo> = () => [],
    // scenesSupplier: () => Vector<SceneInfo> = () => Vector.empty(),
    destroy?: (scenes: ScenesContext) => void
): ScenesContext {

    const context = useContext<ScenesContext>(SceneContext);

    /**
     * Returns the scene for the specified name
     * @param {string} sceneId The ID of the scene (generally a descriptive name)
     * @return {Option<SceneInfo>} An option holding the scene information, if found; else
     * an empty option
     */
    function sceneFor(sceneId: string): Option<SceneInfo> {
        // const sceneInfo = context.scenes.find(info => info.name === sceneId);
        return Option.ofNullable(context.scenes.find(info => info.name === sceneId));
        // return context.scenes.find(info => info.name === sceneId);
    }

    /**
     * Adds the entity to the scene for the specified ID. If the scene ID is not found,
     * then the scene is not added.
     * @param {string} sceneId The ID of the scene to which to add the entity
     * @param {E} entity The entity to add to the scene
     * @return {[string, E]} A tuple holding the scene ID and the entity, passed through.
     */
    function addToScene<E extends Object3D>(sceneId: string, entity: E): [string, E] {
        sceneFor(sceneId)
            .ifSome(info => info.scene.add(entity))
            .ifNone(() => console.log(`Unable to add entity to the scene because the scene was not found: scene ID: ${sceneId}`))
            .isSome();
        return [sceneId, entity];
    }

    /**
     * Sets the visibility of the scene with the specified ID. When setting the visibility
     * of the scene to `false`, the entire scene will no longer be rendered.
     * @param {string} sceneId The ID of the scene
     * @param {boolean} visible The visibility of the scene.
     */
    function visibility(sceneId: string, visible: boolean): void {
        sceneFor(sceneId)
            .ifSome(info => info.visible = visible)
            .ifNone(() => console.log(`Unable to set scene visibility because the scene was not found: scene ID: ${sceneId}; visible: ${visible}`));
    }

    /**
     * Returns the visibility of the scene.
     * @param {string} sceneId The ID of the scene
     * @return {boolean} `true` if the scene is visible; `false` if the scene is not visible.
     */
    function isVisible(sceneId: string): boolean {
        return sceneFor(sceneId).map(info => info.visible).getOrElse(false);
    }

    function clearScenes(): void {
        context.scenes = []
    }

    // calls the setup function passed by the caller and keeps a hold on the
    // entity just created as a reference. when components are unmounted, destroys
    // the entity and removes it from the scene.
    useEffect(() => {
            context.scenes = scenesSupplier();

            // clean-up function
            return (): void => {
                destroy?.(context);
                // context.scenes = Vector.empty();
                context.scenes = [];
            };
        },
        []
    );

    return {sceneFor, addToScene, visibility, isVisible, scenes: context.scenes, clearScenes};
}
