import * as React from 'react';
import {createContext, useEffect, useRef, useState} from 'react';

import Canvas, {CanvasStyle} from './Canvas';
import {Coordinate} from "./Coordinate";
import {Color, Object3D, PerspectiveCamera, Renderer, Scene, WebGLRenderer} from "three";
import useAnimationFrame from "./useAnimationFrame";
import {Option} from "prelude-ts";

function noop(): void {
    /* empty */
}

/**
 * The scene information.
 */
export interface SceneInfo {
    readonly name: string;
    readonly scene: Scene;
    visible: boolean;
}

/**
 * Holds the three-js components needed to render the three-js view: scene, camera, canvas, and
 * an animation timer. The scene and camera are three-js objects.
 */
export interface UseThreeValues {
    // functions for managing scenes
    scenes: Array<SceneInfo>
    sceneFor: (sceneId: string) => Option<SceneInfo>;
    addToScene: <E extends Object3D>(sceneId: string, entity: E) => [string, E];
    visibility: (sceneId: string, visible: boolean) => void;
    isVisible: (sceneId: string) => boolean;
    clearScenes: () => void

    // three-js objects
    camera?: PerspectiveCamera;
    renderer?: Renderer;
    canvas: HTMLCanvasElement | null;

    timer: number
}

/**
 * Three react context holding the three-js context
 * @type {React.Context<UseThreeValues>} The react context holding the three-js elements
 */
export const ThreeContext = createContext<UseThreeValues>({
    canvas: null,
    timer: 0,
    sceneFor: () => Option.none(),
    addToScene: <E extends Object3D>(sceneId: string, entity: E) => [sceneId, entity],
    // (sceneId: string, visible: boolean) => void,
    visibility: noop,
    // (sceneId: string) => boolean,
    isVisible: () => false,
    // scenes: Vector.empty()
    scenes: [],
    clearScenes: noop,
});

/**
 * The properties for the three-js manager.
 */
export interface OwnProps {
    canvasId: string;

    // functions for managing scenes
    scenesSupplier?: () => Array<SceneInfo>

    // function that returns the perspective camera given the canvas offsets and camera position
    getCamera: (offsetWidth: number, offsetHeight: number, position?: Coordinate) => PerspectiveCamera;
    // function that returns the renderer for the scene
    getRenderer: (canvas: HTMLCanvasElement) => Renderer;
    // the background color
    backgroundColor: Color;
    // canvas width and height
    width: number;
    height: number;
    // additional canvas style objects
    canvasStyle: CanvasStyle;
    animate?: boolean;
    // the children of this "three-js scene" to whom the three-js context will be passed
    children: JSX.Element[] | JSX.Element;
}

/**
 * Manages the three-js components -- scene, camera, and renderer -- and the canvas on which they
 * operate.
 *
 * @remarks
 * The integration of three-js with class-style react was written about by
 * [Pierfrancesco Soffritti](https://itnext.io/how-to-use-plain-three-js-in-your-react-apps-417a79d926e0).
 * The integration of three-js with functional-style react was developed by
 * [Aaron Siladi](https://github.com/aarosil/react-three-hook). This work adds typescript to the mix.
 *
 * @example
 * import * as React from 'react';
 * import {useState} from 'react';
 * import SceneManager from '../basethree/ThreeJsManager';
 * import Cube from './Cube';
 * import Grid from '../basethree/Grid';
 * import CameraOrbitControls from '../basethree/CameraOrbitControls';
 * import { getCamera, getRenderer, getScene } from './threeSetup';
 *
 * const CubeExample = (): JSX.Element => {
 *    const [color, changeColor] = useState<string>('744902');
 *
 *    return (
 *        <SceneManager
 *            getCamera={getCamera}
 *            getRenderer={getRenderer}
 *            getScene={getScene}
 *            width={500}
 *            height={300}
 *            canvasStyle={{
 *                position: 'absolute',
 *                height: '100%',
 *                width: '100%',
 *                zIndex: -1,
 *            }}
 *        >
 *            <CameraOrbitControls />
 *            <Grid />
 *            <Cube h={50} w={100} d={75} color={parseInt(`0x${color}`)} />
 *        </SceneManager>
 *    );
 * };
 *
 * export default CubeExample;
 *
 * @param {OwnProps} props The properties for the three-js manager
 * @return {Element} The rendered three-js scene
 * @constructor
 */
function ThreeProvider(props: OwnProps): JSX.Element {
    const {
        canvasId,
        children,
        getCamera,
        getRenderer,
        scenesSupplier,
        canvasStyle,
        animate = false,
        width,
        height,
    } = props;

    const [threeIsReady, setThreeIsReady] = useState<boolean>(false);
    const timerRef = useRef<number>(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef<PerspectiveCamera>();
    const rendererRef = useRef<Renderer>();

    const [scenes, setScenes] = useState<Array<SceneInfo>>(scenesSupplier())

    /**
     * Updates the background colors of the scene so that only the first visible scene receives
     * a background color, and the remaining scenes have a `null` background color. In this way
     * the first visible scene renders the background, and the following visible scenes are rendered,
     * transparently, on top of the first visible scene.
     */
    function updateBackground(): void {
        const visibleScenes = scenes.filter(info => info.visible);
        // const visibleScenes = scenesContext.scenes.filter(info => info.visible);
        const numScenes = visibleScenes.length;
        if (numScenes > 0) {
            visibleScenes[0].scene.background = props.backgroundColor;
        }
        if (numScenes > 1) {
            visibleScenes[numScenes-1].scene.background = null;
        }
    }

    // setup scene, camera, and renderer, and store references. importantly, this use-effects method
    // has an empty array for dependencies, and so it only gets called when the component after the
    // first time the component has mounted and rendered, and then again when the component is ready
    // for clean up. That means that the canvasRef will have a value and will not be null.
    useEffect(
        () => {
            // update the background colors of the visible scenes
            updateBackground();

            // realistically, because useEffect is called after the component is mounted, and has
            // been rendered, the canvas will not be undefined. however, typescript doesn't know
            // this and complains, and this guard is better than @ts-ignore
            const canvas = canvasRef.current;
            if (canvas !== null) {
                cameraRef.current = getCamera(canvas.offsetWidth, canvas.offsetHeight);
                rendererRef.current = getRenderer(canvas);
                (rendererRef.current as WebGLRenderer).autoClear = false;
                setThreeIsReady(true);
            }
        },
        []
    );

    // called when the background color changes so that it can set the scene's background color to
    // the new background color
    useEffect(
        () => {
            updateBackground();
            setThreeIsReady(true);
        },
        [props.backgroundColor]
    );

    // update camera and renderer when dimensions change. importantly, this useEffect method
    // has an the offset width and height array for dependencies, and so it only gets called
    // when these values change. that means that the canvasRef will have a value and will not
    // be null.
    useEffect(
        () => {
            // in the code below, there are guards protecting against the canvas, camera, and renderer
            // from being undefined. because the useEffect method is only called after the component
            // is mounted and rendered, these objects will always have a value. however, typescript
            // doesn't know this and complains, and this guard is better than @ts-ignore
            if (cameraRef.current !== undefined) {
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
            }
            if (rendererRef.current !== undefined) {
                rendererRef.current.setSize(width, height);
            }
        },
        [width, height]
    );

    // set animation frame timer value and rerender the scene
    useAnimationFrame(timer => {
        if(animate) {
            timerRef.current = timer;
            if(rendererRef.current && cameraRef.current) {
                scenes
                    .forEach(info => {
                        if (info.visible) {
                            rendererRef.current.render(info.scene, cameraRef.current);
                            (rendererRef.current as WebGLRenderer).clearDepth();
                        }
                    })
            }
        }
    });


    // renders the scene when react renders (and of course the renderer, scene, camera are defined)
    useEffect(
        () => {
            if (rendererRef.current && cameraRef.current) {
                const renderer = rendererRef.current;
                updateBackground();

                // when there are no scenes, don't clear the background
                if(scenes.length > 0) {
                    (renderer as WebGLRenderer).clear();
                }

                // render each of the scenes
                scenes
                    .forEach(info => {
                        if (info.visible) {
                            renderer.render(info.scene, cameraRef.current);
                            (renderer as WebGLRenderer).clearDepth();
                        }
                    })
            }
        }
    );

    /**
     * Returns the scene for the specified name
     * @param {string} sceneId The ID of the scene (generally a descriptive name)
     * @return {Option<SceneInfo>} An option holding the scene information, if found; else
     * an empty option
     */
    function sceneFor(sceneId: string): Option<SceneInfo> {
        return Option.ofNullable(scenes.find(info => info.name === sceneId));
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
        setScenes([])
    }

    const threeContext: UseThreeValues = {
        scenes,
        sceneFor,
        addToScene,
        visibility,
        isVisible,
        clearScenes,

        camera: cameraRef.current,
        renderer: rendererRef.current,
        canvas: canvasRef.current,
        timer: timerRef.current,
    };

    return (
        <>
            <Canvas
                canvasId={canvasId}
                ref={canvasRef}
                style={canvasStyle}
            />
            {threeIsReady && (
                <ThreeContext.Provider value={threeContext}>
                    {children}
                </ThreeContext.Provider>
            )}
        </>
    );
}

export default ThreeProvider;
