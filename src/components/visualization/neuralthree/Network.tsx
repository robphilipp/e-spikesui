import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import SceneManager from '../basethree/ThreeJsManager';
import Grid from '../basethree/Grid';
import CameraOrbitControls from "../basethree/CameraOrbitControls";
import CoordinateAxes from "../basethree/CoordinateAxes";
import {AmbientLight, Color, PerspectiveCamera, Renderer, Scene, Vector3, WebGLRenderer} from "three";
import {Coordinate, coordinateFrom, origin} from "../basethree/Coordinate";
import {ITheme} from "@uifabric/styling";
import {HashMap, Option, Vector} from "prelude-ts";
import {connect} from "react-redux";
import {ApplicationAction} from "../../redux/actions/actions";
import {ThunkDispatch} from "redux-thunk";
import {AppState} from "../../redux/reducers/root";
import {SceneInfo, useScenes} from "../basethree/useScenes";
import Neurons, {NeuronInfo} from "./Neurons";
import Connections, {ConnectionInfo} from "./Connections";
import Synapses from "./Synapses";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {IconButton, IStackTokens, Stack, Toggle} from "@fluentui/react";
import {BoundingSphere, boundSphereFrom} from "../basethree/BoundingSphere";
import {
    axesVisibilityChanged,
    cameraUpdated,
    gridVisibilityChanged,
    NetworkVisualizationAxesChangeAction,
    NetworkVisualizationCameraUpdateAction,
    NetworkVisualizationGridChangeAction,
    NetworkVisualizationRendererUpdateAction,
    NetworkVisualizationScenesUpdateAction,
    rendererUpdated,
    scenesUpdated
} from "../../redux/actions/networkVisualization";
import {NetworkEvent} from "../../redux/actions/networkEvent";
import {Observable} from "rxjs";

export interface ColorRange {
    excitatory: { min: Color, max: Color };
    inhibitory: { min: Color, max: Color };
}

export interface OwnProps {
    sceneHeight: number;
    sceneWidth: number;
    excitationColor?: Color;
    inhibitionColor?: Color;
    colorAttenuation?: number;
    colors?: ColorRange;
    axesOffset?: Coordinate;

    networkObservable: Observable<NetworkEvent>;
    spikeDuration?: number;
}

export interface StateProps {
    itheme: ITheme;

    networkId: Option<string>;
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;

    axesVisible: boolean;
    gridVisible: boolean;
    camera: Option<PerspectiveCamera>;
    renderer: Option<Renderer>;
    scenes: Option<Vector<SceneInfo>>;
}

export interface DispatchProps {
    onAxisVisibilityChange: (visible: boolean) => NetworkVisualizationAxesChangeAction;
    onGridVisibilityChange: (visible: boolean) => NetworkVisualizationGridChangeAction;
    onCameraUpdate: (camera: PerspectiveCamera) => NetworkVisualizationCameraUpdateAction;
    onRendererUpdate: (renderer: Renderer) => NetworkVisualizationRendererUpdateAction;
    onScenesUpdate: (scenes: Vector<SceneInfo>) => NetworkVisualizationScenesUpdateAction;
}

type Props = StateProps & DispatchProps & OwnProps

export const AXES_SCENE_ID = "axes";
export const GRID_SCENE_ID = "grid";
export const NETWORK_SCENE_ID = "network";

/**
 * Calculates the color range for connections given the connection weight
 * @param {ITheme} itheme
 * @param {Color} excitationColor
 * @param {Color} inhibitionColor
 * @param {number} colorAttenuation
 * @return {{excitatory: {min: Color; max: Color}; inhibitory: {min: Color; max: Color}}}
 */
function colorRange(itheme: ITheme, excitationColor: Color, inhibitionColor: Color, colorAttenuation: number) {
    const themePalette = itheme.palette;
    const excitationMinColor = new Color(excitationColor).lerp(new Color(themePalette.white), colorAttenuation);
    const excitationMaxColor = new Color(excitationColor);
    const inhibitionMinColor = new Color(inhibitionColor).lerpHSL(new Color(themePalette.white), colorAttenuation);
    const inhibitionMaxColor = new Color(inhibitionColor);
    return {
        excitatory: {min: new Color(excitationMinColor), max: new Color(excitationMaxColor)},
        inhibitory: {min: new Color(inhibitionMinColor), max: new Color(inhibitionMaxColor)}
    };
}

/**
 * Sets up the visualization for the network.
 * @param {Props} props The properties of the network
 * @return {Element} The react element
 * @constructor
 */
function Network(props: Props): JSX.Element {
    const {
        itheme,
        sceneWidth,
        sceneHeight,
        axesOffset = origin(),
        excitationColor = new Color(0x00ff00),     // green
        inhibitionColor = new Color(0xff0000),     // red
        colorAttenuation = 0.8,
        colors = colorRange(itheme, excitationColor, inhibitionColor, colorAttenuation),
        neurons,
        connections,
        axesVisible,
        gridVisible,
        camera,
        scenes,
        networkObservable,
        onCameraUpdate,
        onScenesUpdate,
        onAxisVisibilityChange,
        onGridVisibilityChange,
        spikeDuration = 50
    } = props;

    const scenesContext = useScenes(() => getScenes());

    const [axesColor, setAxesColor] = useState<string>(itheme.palette.neutralLight);
    const [spikeColor, setSpikeColor] = useState<Color>(new Color(itheme.palette.black));

    const controls = useRef<OrbitControls>(null);

    const [neuronInfo, setNeuronInfo] = useState<Vector<NeuronInfo>>(Vector.ofIterable(neurons.valueIterable()));
    const [connectionInfo, setConnectionInfo] = useState<Array<ConnectionInfo>>(Array.from(connections.valueIterable()));
    const [boundingSphere, setBoundingSphere] = useState<BoundingSphere>(boundSphereFrom(
        Vector.ofIterable(neurons.mapValues(info => info.coords).valueIterable())
    ));

    const cameraPositionRef = useRef<Coordinate>(cameraCoordinates());

    // updates the axis color when the background color is changed
    useEffect(
        () => {
            setAxesColor(itheme.palette.themeTertiary)
            setSpikeColor(new Color(itheme.palette.black))
        },
        [itheme]
    );

    // recalculates the neuron information and bounding sphere when the neurons change
    useEffect(
        () => {
            setNeuronInfo(neurons.toVector().map(entry => entry[1]));
            setBoundingSphere(boundSphereFrom(neurons.toVector().map(entry => entry[1].coords)));
        },
        [neurons]
    );

    // recalculates the connection information when the connections are updated
    useEffect(
        () => {
            setConnectionInfo(connections.toVector().map(connection => connection[1]).toArray());
        },
        [connections]
    );

    useEffect(
        () => {
            setAxesVisibility(axesVisible);
            setGridVisibility(gridVisible);
        },
        []
    )

    /**
     * Sets the visibility of the three-js axes-scene, and then dispatches a message that the axes'
     * visibility has changed.
     * @param {boolean} visible Set to `true` for the axes to be visible; `false` for the
     * axes to be invisible.
     */
    function setAxesVisibility(visible: boolean): void {
        scenesContext.visibility(AXES_SCENE_ID, visible);
        onAxisVisibilityChange(visible)
    }

    /**
     * Sets the visibility of the three-js grid-scene, and then dispatches a message that the grid's
     * visibility has changed.
     * @param {boolean} visible Set to `true` for the grid to be visible; `false` for the
     * grid to be invisible.
     */
    function setGridVisibility(visible: boolean): void {
        scenesContext.visibility(GRID_SCENE_ID, visible);
        onGridVisibilityChange(visible)
    }

    /**
     * Calculates the coordinates of the camera based on the bounding sphere for the spiking network.
     * @return {Coordinate} The camera's coordinates
     */
    function cameraCoordinates(): Coordinate {
        return coordinateFrom(1,1,1)
            .scale(1.25 * boundingSphere.radius)
            .plus(boundingSphere.origin);
    }

    /**
     * Creates a perspective camera, sets the position, and returns the camera
     * @param {number} offsetWidth The canvas offset width in pixels
     * @param {number} offsetHeight The canvas offset height in pixels
     * @param {Coordinate} position The initial camera position
     * @return {PerspectiveCamera} The perspective camera
     */
    function getCamera(offsetWidth: number,
                       offsetHeight: number,
                       position: Coordinate = cameraPositionRef.current): PerspectiveCamera {
        return camera.getOrCall(() => {
            const camera = new PerspectiveCamera(
                45,
                offsetWidth / offsetHeight,
                0.1,
                10000,
            );
            camera.position.set(position.x, position.y, position.z);
            onCameraUpdate(camera);
            return camera;
        })
    }

    /**
     * Resets the camera position to the original, and has the camera look at the origin
     */
    function resetCameraPosition(): void {
        camera.ifSome(cam => {
            const position = cameraCoordinates();
            cam.position.set(position.x, position.y, position.z);
            cam.lookAt(new Vector3(boundingSphere.origin.x, boundingSphere.origin.y, boundingSphere.origin.z));
            cam.updateProjectionMatrix();
            onCameraUpdate(cam);
        })
    }

    /**
     * Creates and returns a WebGL renderer
     * @param {HTMLCanvasElement} canvas The react HTML canvas element
     * @return {Renderer} The WebGL renderer
     */
    function getRenderer(canvas: HTMLCanvasElement): Renderer {
        const context = canvas.getContext('webgl');
        if (context === null) {
            throw "Canvas context cannot be null";
        }
        const renderer = new WebGLRenderer({
            canvas,
            context,
        });

        renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
    }

    /**
     * Creates and returns the scenes (and associated information) that are to be displayed
     * @return The list of scene information objects
     */
    function getScenes(): Vector<SceneInfo> {
        return scenes.getOrCall(() => {
            const light = new AmbientLight(0xffffff, 1);
            const gridScene = new Scene();
            gridScene.add(light);
            const axesScene = new Scene();
            axesScene.add(light);
            const networkScene = new Scene();
            networkScene.add(light);

            const scenes = Vector.of(
                {name: GRID_SCENE_ID, scene: gridScene, visible: false},
                {name: AXES_SCENE_ID, scene: axesScene, visible: false},
                {name: NETWORK_SCENE_ID, scene: networkScene, visible: true}
            );
            onScenesUpdate(scenes);
            return scenes;
        });
    }

    const stackTokens: IStackTokens = {childrenGap: 20};
    return (
        <Stack>
            <Stack.Item>
                <Stack tokens={stackTokens} horizontal>
                    <Toggle
                        label="Axes"
                        inlineLabel
                        checked={axesVisible}
                        onChange={() => setAxesVisibility(!axesVisible)}
                    />
                    <Toggle
                        label="Grid"
                        inlineLabel
                        checked={gridVisible}
                        onChange={() => setGridVisibility(!gridVisible)}
                    />
                    <IconButton
                        iconProps={{iconName: "reset"}}
                        onClick={resetCameraPosition}>
                    </IconButton>
                </Stack>
            </Stack.Item>
            <Stack.Item>
                <SceneManager
                    getCamera={getCamera}
                    getRenderer={getRenderer}
                    getScenes={getScenes}
                    width={sceneWidth}
                    height={sceneHeight}
                    backgroundColor={new Color(itheme.palette.white)}
                    canvasStyle={{
                        position: 'floating',
                        height: `${sceneHeight}px`,
                        width: `${sceneWidth}px`,
                        border: `1px solid ${itheme.palette.neutralLighterAlt}`
                    }}
                >
                    <CameraOrbitControls
                        ref={controls}
                        target={boundingSphere.origin}
                    />
                    <Grid
                        sceneId={GRID_SCENE_ID}
                        size={5000}
                        divisions={100}
                        centerColor={new Color(itheme.palette.white)}
                        gridColor={new Color(itheme.palette.neutralLight)}
                        opacity={1}
                    />
                    <CoordinateAxes
                        sceneId={AXES_SCENE_ID}
                        length={100}
                        color={{
                            x: new Color(axesColor),
                            y: new Color(axesColor),
                            z: new Color(axesColor)
                        }}
                        originOffset={axesOffset}
                        opacity={1}
                    />
                    <Neurons
                        sceneId={NETWORK_SCENE_ID}
                        neurons={neuronInfo.toArray()}
                        excitatoryNeuronColor={excitationColor}
                        inhibitoryNeuronColor={inhibitionColor}
                        colorRange={colors}
                        spikeColor={spikeColor}
                        networkObservable={networkObservable}
                        spikeDuration={spikeDuration}
                    />
                    <Connections
                        sceneId={NETWORK_SCENE_ID}
                        connections={connectionInfo}
                        colorRange={colors}
                        spikeColor={spikeColor}
                        networkObservable={networkObservable}
                        spikeDuration={spikeDuration}
                    />
                    <Synapses
                        sceneId={NETWORK_SCENE_ID}
                        connections={connectionInfo}
                        colorRange={colors}
                        networkObservable={networkObservable}
                        spikeDuration={spikeDuration}
                        spikeColor={spikeColor}
                    />
                </SceneManager>
            </Stack.Item>
        </Stack>
    );
}

/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions/networkEvents.ts for the action types)
 |
 */

/**
 * react-redux function that maps the network-events slice of the application state to the components state-props.
 * @param {AppState} state The application state from the redux root store
 * @return {StateProps} The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState): StateProps => ({
    itheme: state.settings.itheme,

    networkId: state.networkManagement.networkId,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,

    axesVisible: state.networkVisualizationEvent.axesVisible,
    gridVisible: state.networkVisualizationEvent.gridVisible,
    camera: state.networkVisualizationEvent.camera,
    renderer: state.networkVisualizationEvent.renderer,
    scenes: state.networkVisualizationEvent.scenes
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<unknown, unknown, ApplicationAction>): DispatchProps => ({
    onAxisVisibilityChange: (visible: boolean) => dispatch(axesVisibilityChanged(visible)),
    onGridVisibilityChange: (visible: boolean) => dispatch(gridVisibilityChanged(visible)),
    onCameraUpdate: (camera: PerspectiveCamera) => dispatch(cameraUpdated(camera)),
    onRendererUpdate: (renderer: Renderer) => dispatch(rendererUpdated(renderer)),
    onScenesUpdate: (scenes: Vector<SceneInfo>) => dispatch(scenesUpdated(scenes)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Network)
