import {useContext, useEffect, useRef} from 'react';
import {ThreeContext, UseThreeValues} from './ThreeProvider';
import {Object3D, WebGLRenderer} from "three";
import {noop} from "../../../commons";

/**
 * The render function renders the three-js scenes, calling the specified callback before rendering
 * each scene
 */
type RenderFunction = (callback?: () => void) => void

type EntityCallback = (context: UseThreeValues) => void
type DestroyCallback = (context: UseThreeValues) => void
type EntitySupplier<E extends Object3D | Array<Object3D>> = (context: UseThreeValues) => [string, E]
type EntityDestroyer<E extends Object3D | Array<Object3D>> = (context: UseThreeValues, entity: E) => void

/**
 * The default entity supplier, if none is specified by the react hook. This entity supplier
 * returns an array where the first element is default the scene ID (i.e. 'default') and the
 * values a new three-js `Object3D()` of the specified type, `E`.
 */
function defaultSupplier<E extends Object3D | Array<Object3D>>(): () => [string, E] {
    return () => ['default', new Object3D() as E]
}

/**
 * Object returned by the `useThreeContext` hook. Holds the context and the renderer.
 */
interface UseThreeContextValues {
    context: UseThreeValues
    render: RenderFunction
}

/**
 * React hook for three-js context when the set-up function does not return anything. The hook returns
 * the three-js context. Generally, use this hook for controls, such as the OrbitControls, or the FlyControls,
 * etc.
 * @param setup A function that is called to set up the object
 * @param destroy A function that performs any clean up when the component
 * is unmounted
 * @return The three-js context.
 */
export function useThreeContext(setup: EntityCallback = noop, destroy?: DestroyCallback): UseThreeContextValues {
    const context = useContext<UseThreeValues>(ThreeContext);

    useEffect(() => {
        setup(context);

        return (): void => {
            destroy?.(context);
        }
    }, []);

    return {
        context,
        render: (callback: () => void = noop) => renderScenes(context, callback)
    };
}

/**
 * Object returned by the `useThree` hook, extends the `UseThreeContext` by adding a function to
 * to the returned object that allows the caller to retrieve the three-js entity.
 */
interface UseThreeEntityValues<E extends Object3D | Array<Object3D>> extends UseThreeContextValues {
    getEntity: () => E
}

/**
 * React hook for three-js when the set-up function returns an entity (i.e. something that derives from
 * an `Object3D`). Generally use this hook for objects that are added to a scene.
 * This hook returns two things:
 * 1. the `ThreeContext` for components that are children of the `ThreeJsManager`
 * 2. a function that returns a reference to the entity returned by the set-up function
 * @param setup The set-up function that returns the entity for which we
 * hold the reference
 * @param {(context: ThreeContext, entity: E) => void} destroy The function that removes the entity from the scene
 * @return {{getEntity: () => E; context: ThreeContext}} An object holding two things:
 * 1. the three-js context, and
 * 2. a supplier for the entity (i.e. a function that returns the entity)
 */
export function useThree<E extends Object3D | Array<Object3D>>(
    setup: EntitySupplier<E> = defaultSupplier<E>(),
    destroy?: EntityDestroyer<E>
): UseThreeEntityValues<E> {

    const entityRef = useRef<E>();
    const sceneIdRef = useRef<string>('default');
    const context = useContext<UseThreeValues>(ThreeContext);

    const getEntity = (): E => entityRef.current;

    // calls the setup function passed by the caller and keeps a hold on the
    // entity just created as a reference. when components are unmounted, destroys
    // the entity and removes it from the scene.
    useEffect(
        () => {
            const [sceneId, entity] = setup(context);
            sceneIdRef.current = sceneId;
            entityRef.current = entity;
            if (entity instanceof Array) {
                entity.forEach(e => context.addToScene(sceneId, e as Object3D))
            } else {
                context.addToScene(sceneId, entity as Object3D)
            }

            // clean-up function
            return (): void => {
                destroy?.(context, entityRef.current);
                context.sceneFor(sceneIdRef.current)
                    .ifSome(info => {
                        if (entityRef.current instanceof Array) {
                            entityRef.current.forEach(entity => info.scene.remove(entity))
                        } else {
                            info.scene.remove(entityRef.current as Object3D)
                        }
                    });
            };
        },
        []
    );

    return {
        getEntity,
        context,
        render: (callback: () => void = noop) => renderScenes(context, callback)
    };
}

/**
 * Calls the requested callback function and then renders the scene
 * @param context The three-js context
 * @param callback An optional callback function which this methods calls before updating
 * each three-js scene.
 */
function renderScenes(context: UseThreeValues, callback: () => void = noop): void {
    const {renderer, camera, canvas} = context;
    requestAnimationFrame(() => {
        if (renderer && camera && canvas) {
            (renderer as WebGLRenderer).clear();
            context.scenes
                .forEach(info => {
                    if(info.visible) {
                        callback();
                        renderer.render(info.scene, camera);
                        (renderer as WebGLRenderer).clearDepth();
                    }
                });
        }
    });
}
