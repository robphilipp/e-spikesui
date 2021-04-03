import {useContext, useEffect, useRef} from 'react';
import {ThreeContext, UseThreeValues} from './ThreeProvider';
import {Object3D, WebGLRenderer} from "three";
import {noop} from "../../../commons";

/**
 * React hook for three-js when the set-up function returns an entity (i.e. something that derives from
 * an `Object3D`). Generally use this hook for objects that are added to a scene.
 * This hook returns two things:
 * 1. the `ThreeContext` for components that are children of the `ThreeJsManager`
 * 2. a function that returns a reference to the entity returned by the set-up function
 * @param {(context: ThreeContext) => E} setup The set-up function that returns the entity for which we
 * hold the reference
 * @param {(context: ThreeContext, entity: E) => void} destroy The function that removes the entity from the scene
 * @return {{getEntity: () => E; context: ThreeContext}} An object holding two things:
 * 1. the three-js context, and
 * 2. a supplier for the entity (i.e. a function that returns the entity)
 */
export function useThree<E extends Object3D | Array<Object3D>>(
    setup: (context: UseThreeValues) => [string, E] = () => ['default', new Object3D() as E],
    destroy?: (context: UseThreeValues, entity: E) => void,
): { getEntity: () => E, context: UseThreeValues, render: () => void } {

    const entityRef = useRef<E>();
    const sceneIdRef = useRef<string>('default');
    const context = useContext<UseThreeValues>(ThreeContext);

    const renderRef = useRef<() => void>(noop);
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
            renderRef.current = () => threeRender(context, noop)

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
        render: renderRef.current
    };
}

/**
 * React hook for three-js context when the set-up function does not return anything. The hook returns
 * the three-js context. Generally, use this hook for controls, such as the OrbitControls, or the FlyControls,
 * etc.
 * @param {(context: ThreeContext) => void} setup A function that is called to set up the object
 * @param {(context: ThreeContext) => void} destroy A function that performs any clean up when the component
 * is unmounted
 * @return {UseThreeValues} The three-js context.
 */
export function useThreeContext(
    setup: (context: UseThreeValues) => void = noop,
    destroy?: (context: UseThreeValues) => void
): UseThreeValues {

    const context = useContext<UseThreeValues>(ThreeContext);

    useEffect(() => {
        setup(context);

        return (): void => {
            destroy?.(context);
        }
    }, []);

    return context;
}

/**
 * This is not a react hook.
 * Calls the requested callback function and then renders the scene
 * @param {UseThreeValues} context The three-js context
 * @param {() => void} callback The callback function
 */
export function threeRender(context: UseThreeValues, callback: () => void): void {
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
