import * as React from 'react';
import {createContext, useEffect, useMemo, useRef, useState} from 'react';

import Canvas, {CanvasStyle} from './Canvas';
// import useAnimationFrame from './useAnimationFrame';
import {Coordinate} from "./Coordinate";
import {Color, PerspectiveCamera, Renderer, WebGLRenderer} from "three";
import {emptySceneContext, SceneInfo, ScenesContext, useScenes} from "./useScenes";
import {Vector} from "prelude-ts";
import useAnimationFrame from "./useAnimationFrame";

/**
 * Holds the three-js components needed to render the three-js view: scene, camera, canvas, and
 * an animation timer. The scene and camera are three-js objects.
 */
export interface ThreeContext {
    scenesContext: ScenesContext;
    camera?: PerspectiveCamera;
    renderer?: Renderer;
    canvas: HTMLCanvasElement | null;
    timer: number
}

/**
 * Three react context holding the three-js context
 * @type {React.Context<ThreeContext>} The react context holding the three-js elements
 */
export const initialThreeContext = createContext<ThreeContext>({
    canvas: null,
    timer: 0,
    scenesContext: emptySceneContext
});

/**
 * The properties for the three-js manager.
 */
export interface OwnProps {
    // the children of this "three-js scene" to whom the three-js context will be passed
    children: JSX.Element[];
    // function that returns the perspective camera given the canvas offsets and camera position
    getCamera: (offsetWidth: number, offsetHeight: number, position?: Coordinate) => PerspectiveCamera;
    // function that returns the renderer for the scene
    getRenderer: (canvas: HTMLCanvasElement) => Renderer;
    // function that returns the scene object to which all the scene elements have been added
    // getScene: () => Scene;
    getScenes: () => Vector<SceneInfo>
    // the background color
    backgroundColor: Color;
    // canvas width and height
    width: number;
    height: number;
    // additional canvas style objects
    canvasStyle: CanvasStyle;
    animate?: boolean;
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
function ThreeJsManager(props: OwnProps): JSX.Element {
    const {
        children,
        getCamera,
        getRenderer,
        getScenes,
        canvasStyle,
        animate = false,
        width,
        height,
    } = props;

    const [threeIsReady, setThreeIsReady] = useState<boolean>(false);
    const timerRef = useRef<number>(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scenesContext = useScenes(() => getScenes());
    const cameraRef = useRef<PerspectiveCamera>();
    const rendererRef = useRef<Renderer>();

    const threeContext: ThreeContext = {
        scenesContext: scenesContext,
        camera: cameraRef.current,
        renderer: rendererRef.current,
        canvas: canvasRef.current,
        timer: timerRef.current,
    };

    /**
     * Updates the background colors of the scene so that only the first visible scene receives
     * a background color, and the remaining scenes have a `null` background color. In this way
     * the first visible scene renders the background, and the following visible scenes are rendered,
     * transparently, on top of the first visible scene.
     */
    function updateBackground(): void {
        scenesContext.scenes
            .filter(info => info.visible)
            .head()
            .ifSome(info => info.scene.background = props.backgroundColor);
        scenesContext.scenes
            .filter(info => info.visible)
            .tail()
            .ifSome(infos => infos.forEach(info => info.scene.background = null));
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
            // updateTimer(timer);
            timerRef.current = timer;
            if(rendererRef.current && cameraRef.current) {
                const renderer = rendererRef.current;
                const camera = cameraRef.current;
                scenesContext.scenes
                    .filter(info => info.visible)
                    .forEach(info => {
                        renderer.render(info.scene, camera);
                        (renderer as WebGLRenderer).clearDepth();
                    })
            }
        }
    });


    // renders the scene when react renders (and of course the renderer, scene, camera are defined)
    useEffect(
        () => {
            if (rendererRef.current && cameraRef.current) {
                const renderer = rendererRef.current;
                const camera = cameraRef.current;
                updateBackground();

                // when there are no scenes, don't clear the background
                if(!scenesContext.scenes.isEmpty()) {
                    (renderer as WebGLRenderer).clear();
                }

                // render each of the scenes
                scenesContext.scenes
                    .filter(info => info.visible)
                    .forEach(info => {
                        renderer.render(info.scene, camera);
                        (renderer as WebGLRenderer).clearDepth();
                    })
            }
        }
    );

    return (
        <>
            <Canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={canvasStyle}
            />
            {threeIsReady && (
                <initialThreeContext.Provider value={threeContext}>
                    {children}
                </initialThreeContext.Provider>
            )}
        </>
    );
}

export default ThreeJsManager;
