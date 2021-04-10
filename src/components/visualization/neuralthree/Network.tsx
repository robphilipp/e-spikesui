import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import ThreeProvider, {SceneInfo} from '../basethree/ThreeProvider';
import Grid from '../basethree/Grid';
import CameraOrbitControls from "../basethree/CameraOrbitControls";
import CoordinateAxes from "../basethree/CoordinateAxes";
import {AmbientLight, Color, PerspectiveCamera, Renderer, Scene, WebGLRenderer} from "three";
import {Coordinate, coordinateFrom, origin} from "../basethree/Coordinate";
import {ITheme} from "@uifabric/styling";
import {HashMap, Option, Vector} from "prelude-ts";
import {connect} from "react-redux";
import {ApplicationAction} from "../../redux/actions/actions";
import {ThunkDispatch} from "redux-thunk";
import {AppState} from "../../redux/reducers/root";
import Neurons, {NeuronInfo} from "./Neurons";
import Connections, {ConnectionInfo} from "./Connections";
import Synapses from "./Synapses";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Stack} from "@fluentui/react";
import {BoundingSphere, boundSphereFrom} from "../basethree/BoundingSphere";
import {
    cameraUpdated,
    NetworkVisualizationCameraUpdateAction,
    NetworkVisualizationRendererUpdateAction,
    NetworkVisualizationScenesUpdateAction,
    rendererUpdated,
    scenesUpdated
} from "../../redux/actions/networkVisualization";
import {NetworkEvent} from "../../redux/actions/networkEvent";
import {Observable} from "rxjs";
import {initialNetVisState} from "../../redux/reducers/networkVisualization";
import {useTheme} from "../../common/useTheme";
import Controls from "./Controls";

export interface ColorRange {
    excitatory: { min: Color, max: Color };
    inhibitory: { min: Color, max: Color };
}

export interface OwnProps {
    visualizationId: string;
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
    networkId: Option<string>;
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;

    axesVisible: boolean;
    gridVisible: boolean;
    camera: Option<PerspectiveCamera>;
    renderer: Option<Renderer>;
    scenes: Option<Array<SceneInfo>>;
}

export interface DispatchProps {
    onCameraUpdate: (id: string, camera: PerspectiveCamera) => NetworkVisualizationCameraUpdateAction;
    onRendererUpdate: (id: string, renderer: Renderer) => NetworkVisualizationRendererUpdateAction;
    onScenesUpdate: (id: string, scenes: Array<SceneInfo>) => NetworkVisualizationScenesUpdateAction;
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
    const {itheme} = useTheme()

    const {
        visualizationId,
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
        spikeDuration = 50
    } = props;

    const [axesColor, setAxesColor] = useState<Color>(new Color(itheme.palette.themeDarker));
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
            setAxesColor(new Color(itheme.palette.themeDarker))
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

    /**
     * Calculates the coordinates of the camera based on the bounding sphere for the spiking network.
     * @return {Coordinate} The camera's coordinates
     */
    function cameraCoordinates(): Coordinate {
        return coordinateFrom(1, 1, 1)
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
        return camera
            .getOrCall(() => {
                const camera = new PerspectiveCamera(45, offsetWidth / offsetHeight, 0.1, 10000,);
                camera.position.set(position.x, position.y, position.z);
                onCameraUpdate(visualizationId, camera);
                return camera;
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
        const renderer = new WebGLRenderer({canvas, context});

        renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
    }

    /**
     * Creates and returns the scenes (and associated information) that are to be displayed
     * @return The list of scene information objects
     */
    function getScenes(): Array<SceneInfo> {
        return scenes.getOrCall(() => {
            const light = new AmbientLight(0xffffff, 2);
            const gridScene = new Scene();
            gridScene.add(light);
            const axesScene = new Scene();
            axesScene.add(light);
            const networkScene = new Scene();
            networkScene.add(light);

            const scenes: Array<SceneInfo> = [
                {name: GRID_SCENE_ID, scene: gridScene, visible: gridVisible},
                {name: AXES_SCENE_ID, scene: axesScene, visible: axesVisible},
                {name: NETWORK_SCENE_ID, scene: networkScene, visible: true}
            ];
            onScenesUpdate(visualizationId, scenes);
            return scenes;
        });
    }

    return (
        <Stack>
            <Stack.Item>
                <ThreeProvider
                    canvasId="network-canvas"
                    getCamera={getCamera}
                    getRenderer={getRenderer}
                    scenesSupplier={getScenes}
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
                    <Controls
                        visualizationId={visualizationId}
                        gridSceneId={GRID_SCENE_ID}
                        axisSceneId={AXES_SCENE_ID}
                        boundingSphere={boundingSphere}
                    />
                    <CameraOrbitControls
                        ref={controls}
                        target={boundingSphere.origin}
                    />
                    <Grid
                        sceneId={GRID_SCENE_ID}
                        size={5000}
                        divisions={100}
                        centerColor={new Color(itheme.palette.neutralTertiaryAlt)}
                        gridColor={new Color(itheme.palette.neutralLight)}
                        opacity={1}
                    />
                    <CoordinateAxes
                        sceneId={AXES_SCENE_ID}
                        length={100}
                        color={{x: axesColor, y: axesColor, z: axesColor}}
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
                </ThreeProvider>
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
 * @param state The application state from the redux root store
 * @param ownProps The Network components own properties (holding the visualization ID)
 * @return The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    networkId: state.networkManagement.networkId,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,

    axesVisible: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.axesVisible)
        .getOrElse(initialNetVisState.axesVisible),
    gridVisible: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.gridVisible)
        .getOrElse(initialNetVisState.gridVisible),
    camera: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.camera)
        .getOrElse(initialNetVisState.camera),
    renderer: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.renderer)
        .getOrElse(initialNetVisState.renderer),
    scenes: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.scenes)
        .getOrElse(initialNetVisState.scenes),
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<unknown, unknown, ApplicationAction>): DispatchProps => ({
    onCameraUpdate: (id: string, camera: PerspectiveCamera) => dispatch(cameraUpdated(id, camera)),
    onRendererUpdate: (id: string, renderer: Renderer) => dispatch(rendererUpdated(id, renderer)),
    onScenesUpdate: (id: string, scenes: Array<SceneInfo>) => dispatch(scenesUpdated(id, scenes)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Network)
