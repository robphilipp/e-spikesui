import {UseThreeValues} from "../basethree/ThreeProvider";
import {BufferAttribute, BufferGeometry, Clock, Color, LineBasicMaterial, LineSegments} from "three";
import {threeRender, useThree} from "../basethree/useThree";
import {NeuronInfo} from "./Neurons";
import {useEffect, useRef} from "react";
import {ColorRange} from "./Network";
import {Observable} from "rxjs";
import {CONNECTION_WEIGHT, ConnectionWeight, NetworkEvent, Spike, SPIKE} from "../../redux/actions/networkEvent";
import {filter} from "rxjs/operators";
import {noop} from "../../../commons";
import {useScenes} from "../basethree/useScenes";

export interface ConnectionInfo {
    preSynaptic: NeuronInfo;
    postSynaptic: NeuronInfo;
    weight: number;
}

export interface ConnectionColor {
    connectionIndex: number;
    preSynaptic: Color;
    postSynaptic: Color;
}

export interface OwnProps {
    sceneId: string;
    connections: Array<ConnectionInfo>;
    colorRange: ColorRange;
    spikeColor: Color;
    spikeDuration: number;

    networkObservable: Observable<NetworkEvent>;
}

/**
 * Creates the array of connection positions from the connection info.
 *
 * When the optional `connectionPositions` is not specified, or if the number of connection positions is
 * inconsistent with the length of the `connections` length, then a new `Float32Array` is returned (with
 * a new reference).
 * @param {Array<ConnectionInfo>} connections The array holding the pre- and post-synaptic neuron information
 * @param {Float32Array} [connectionPositions] An optional array of connection positions.
 * @return {Float32Array} Holding the flattened connection coordinates. The coordinates
 * in the array alternate between the pre and post synaptic neuron. For example,
 * [c1pre_x, c1pre_y, c1pre_z, c1post_x, c1post_y, c1post_z, c1....].
 */
function connectionPositionsFrom(connections: Array<ConnectionInfo>, connectionPositions?: Float32Array): Float32Array {

    function setConnectionPosition(connectionId: number, connection: ConnectionInfo, positions: Float32Array) {
        // line segment start
        let [x, y, z] = connection.preSynaptic.coords.toArray();
        positions[(2 * connectionId) * 3] = x;
        positions[(2 * connectionId) * 3 + 1] = y;
        positions[(2 * connectionId) * 3 + 2] = z;

        // line segment end
        [x, y, z] = connection.postSynaptic.coords.toArray();
        positions[(2 * connectionId + 1) * 3] = x;
        positions[(2 * connectionId + 1) * 3 + 1] = y;
        positions[(2 * connectionId + 1) * 3 + 2] = z;
    }

    const positions = connectionPositions && connectionPositions.length === connections.length * 2 * 3 ?
        connectionPositions :
        new Float32Array(connections.length * 2 * 3);
    connections.forEach((connection, i) => setConnectionPosition(i, connection, positions));
    return positions;
}

/**
 * Creates the array of connection colors from the connection info. Connections emanating from excitation
 * neurons have a color specified by the base-colors excitation object, and connections emanating from
 * inhibition neurons have a color specified by the base-colors inhibition object. The connection color
 * changes from it's min value when the weight is zero, to its max value when the weight is unity.
 * minimum value.
 *
 * When the optional `connectionColors` is not specified, or if the number of connections is inconsistent with
 * the length of the `connections` length, then a new `Float32Array` is returned (with a new reference).
 * @param {Array<ConnectionInfo>} connections The array holding the pre- and post-synaptic neuron information
 * @param {ColorRange} baseColors The colors for calculating the weight adjusted color
 * @param {Float32Array} [connectionColors] An optional parameter holding the array of connection colors used by ThreeJs.
 * If this parameter is not specified, or of the size is inconsistent with the array of connections, then a new
 * Float32Array is created and returned, which changes the reference. Otherwise, the same array is used and returned.
 * @return {Float32Array} Holding the flattened connection colors (RGB). The coordinates
 * in the array alternate between the pre and post synaptic neuron. For example,
 * [c1pre_x, c1pre_y, c1pre_z, c1post_x, c1post_y, c1post_z, c1....].
 */
function connectionColorsFrom(connections: Array<ConnectionInfo>,
                              baseColors: ColorRange,
                              connectionColors?: Float32Array): Float32Array {

    function setConnectionColor(connectionId: number, connection: ConnectionInfo, colors: Float32Array): void {
        const color = connection.preSynaptic.type === 'e' ? baseColors.excitatory : baseColors.inhibitory;
        const adjustedColor = new Color(color.min).lerp(color.max, connection.weight);
        colors[3 * 2 * connectionId] = adjustedColor.r;
        colors[3 * 2 * connectionId + 1] = adjustedColor.g;
        colors[3 * 2 * connectionId + 2] = adjustedColor.b;

        colors[(3 * (2 * connectionId + 1))] = adjustedColor.r;
        colors[(3 * (2 * connectionId + 1)) + 1] = adjustedColor.g;
        colors[(3 * (2 * connectionId + 1)) + 2] = adjustedColor.b;
    }

    const colors = connectionColors && connectionColors.length === connections.length * 2 * 3 ?
        connectionColors :
        new Float32Array(connections.length * 2 * 3);
    connections.forEach((connection, i) => setConnectionColor(i, connection, colors));
    return colors;
}

/**
 * Calculates the outgoing connections for the specified neuron and returns an array holding
 * the connections' indexes.
 * @param {string} neuronId The name of the neuron
 * @param {Array<ConnectionInfo>} connections The array holding the index pre- and post-synaptic neuron information
 * @return {Array<[number, ConnectionInfo]>} An array holding the index and the connection information for each
 * connection that is emanating from the (pre-synaptic) neuron with the specified ID
 */
export function outgoingConnectionsFor(neuronId: string, connections: Array<ConnectionInfo>): Array<[number, ConnectionInfo]> {
    return connections
        .reduce(
            (outgoingConnections: Array<[number, ConnectionInfo]>, connection: ConnectionInfo, index: number) => {
                if (connection.preSynaptic.name === neuronId) {
                    outgoingConnections.push([index, connection]);
                }
                return outgoingConnections;
            },
            new Array<[number, ConnectionInfo]>()
        );
}

/**
 * Calculates the connection color from the base color range, adjusted for the connection's weight.
 * @param {number} connectionIndex The index of the connection in the color array
 * @param {ConnectionInfo} connectionInfo The information about the connection
 * @param {ColorRange} baseColors The colors for calculating the weight adjusted color
 * @return {ConnectionColor} Holds the colors for the pre- and post-synaptic neurons and the index into the
 * connection color three-js `Float32Array`.
 */
function connectionColorFor(connectionIndex: number,
                            connectionInfo: ConnectionInfo,
                            baseColors: ColorRange): ConnectionColor {
    const color = connectionInfo.preSynaptic.type === 'e' ? baseColors.excitatory : baseColors.inhibitory;
    const adjustedColor = new Color(color.min).lerp(color.max, connectionInfo.weight);
    return {
        connectionIndex: connectionIndex,
        preSynaptic: new Color(adjustedColor),
        postSynaptic: new Color(adjustedColor)
    };
}

/**
 * **WARNING**: This method modifies the original color array.
 * **NOTE**: The method does not call the geometry's update method
 * Updates the specified connection-colors array with the new colors.
 * @param {number} connectionIndex The index of the connection into the original connections description object
 * @param {Float32Array} connectionColors The array holding the colors for the edges two vertices (i.e. the
 * head and tail). The length of the connection colors array must be 6 times the length of the original connection
 * information array.
 * @param {Color} preSynapticColor The color of the vertex for the pre-synaptic neuron
 * @param {Color} postSynapticColor The color of the vertex for the post-synaptic neuron
 */
function updateConnectionColor(connectionIndex: number,
                               connectionColors: Float32Array,
                               preSynapticColor: Color,
                               postSynapticColor: Color): void {
    connectionColors[connectionIndex * 6] = preSynapticColor.r;
    connectionColors[connectionIndex * 6 + 1] = preSynapticColor.g;
    connectionColors[connectionIndex * 6 + 2] = preSynapticColor.b;
    connectionColors[connectionIndex * 6 + 3] = postSynapticColor.r;
    connectionColors[connectionIndex * 6 + 4] = postSynapticColor.g;
    connectionColors[connectionIndex * 6 + 5] = postSynapticColor.b;
}

/**
 * Represents the connection from a pre-synaptic neuron to a post-synaptic. The connection color
 * is adjusted based on its weight, and whether the pre-synaptic neuron is excitatory or inhibitory.
 * @param {OwnProps} props The visualization properties for the connections
 * @return {null} Always a null
 * @constructor
 */
function Connections(props: OwnProps): null {
    const {
        sceneId,
        connections,
        colorRange,
        spikeColor,
        spikeDuration,
        networkObservable
    } = props;

    const scenesContext = useScenes()

    const connectionPositionsRef = useRef<Float32Array>(connectionPositionsFrom(connections));
    const connectionColorsRef = useRef<Float32Array>(connectionColorsFrom(connections, colorRange));
    const connectionsRef = useRef<Array<ConnectionInfo>>(connections);
    const lineSegmentsRef = useRef<LineSegments>();
    const contextRef = useRef<UseThreeValues>();
    const renderRef = useRef<() => void>(noop);

    const connectionGeometryRef = useRef(new BufferGeometry());

    const spikeColorRef = useRef<Color>(spikeColor)

    useEffect(
        () => {
            spikeColorRef.current = spikeColor;
        },
        [spikeColor]
    )

    // called when the connections or the color range are modified to recalculate the connection colors
    useEffect(
        () => {
            connectionPositionsRef.current = connectionPositionsFrom(connections, connectionPositionsRef.current);
            connectionColorsRef.current = connectionColorsFrom(connections, colorRange, connectionColorsRef.current);
            connectionsRef.current = connections;

            connectionGeometryRef.current.setAttribute('position', new BufferAttribute(connectionPositionsRef.current, 3));
            connectionGeometryRef.current.setAttribute('color', new BufferAttribute(connectionColorsRef.current, 3));
            connectionGeometryRef.current.computeBoundingSphere();
            connectionGeometryRef.current.setDrawRange(0, connections.length * 2);
            const connectionMaterial = new LineBasicMaterial({
                vertexColors: true,
                transparent: true
            });

            lineSegmentsRef.current = new LineSegments(connectionGeometryRef.current, connectionMaterial);
        },
        [connections, colorRange]
    );

    // creates the connections between the pre- and post-synaptic neurons and adds them to the scene
    useThree<LineSegments>(scenesContext, (context: UseThreeValues): [string, LineSegments] => {
        contextRef.current = context;
        return scenesContext.addToScene(sceneId, lineSegmentsRef.current);
        // return context.scenesContext.addToScene(sceneId, lineSegmentsRef.current);
    });

    // called when the component is mounted or the context changes to set the render function needed to animate
    // the connections' spiking
    useEffect(
        () => renderRef.current = () => threeRender(contextRef.current, scenesContext, noop),
        [contextRef.current]
    );

    /**
     * Animates the neuron spike by changing the neuron's color to the spike-color, and then after the an number
     * of milliseconds specified by the spike-duration, the neuron's color is set back to its original color.
     * When this function is called, sets the neuron to the spiking color, then after a spike-duration (ms) calls
     * itself to set the color back to the neuron's original color.
     * @param {Array<ConnectionColor>} originalColors The colors before the spike animation
     * @param {Float32Array} connectionColors The current colors before the spike animation
     * @param {boolean} spiking Set to `true` will cause the connection to be displayed with the spike color; set to
     * `false` will cause the connection to be displayed in the original color.
     */
    function animateSpike(originalColors: Array<ConnectionColor>, connectionColors: Float32Array, spiking: boolean) {

        originalColors.forEach(original => {
            const preSynapticColor = spiking ? spikeColorRef.current : original.preSynaptic;
            const postSynapticColor = spiking ? spikeColorRef.current : original.postSynaptic;
            updateConnectionColor(original.connectionIndex, connectionColors, preSynapticColor, postSynapticColor);
        });

        // update the connection color based on whether the pre-synaptic neuron is spiking or not and
        // let three-js know that the colors need to be updated
        const attribute = ((lineSegmentsRef.current as LineSegments).geometry as BufferGeometry).attributes.color as BufferAttribute;
        if (attribute !== undefined) {
            attribute.needsUpdate = true
        }

        // render the scene with three-js
        renderRef.current();

        // if spiking, then call this function again after a delay to set the neuron's color back to
        // its original value
        if (spiking) {
            setTimeout(
                () => requestAnimationFrame(
                    () => animateSpike(originalColors, connectionColors, false)
                ),
                spikeDuration
            );
        }
    }

    useEffect(
        () => {
            // subscribe to the spike events and animate the spike by flashing the connection
            const spikesSubscription = networkObservable
                .pipe(filter(event => event.type === SPIKE))
                .subscribe({
                    next: event => {
                        if (contextRef.current && lineSegmentsRef.current) {
                            const originalColors = outgoingConnectionsFor((event.payload as Spike).neuronId, connectionsRef.current)
                                .map(info => connectionColorFor(info[0], info[1], props.colorRange));

                            // flash the connections
                            animateSpike(originalColors, connectionColorsRef.current, true);
                        }
                    },
                    error: error => console.error(error),
                    complete: () => console.log("complete")
                });

            // subscribe to connection weights change events, and update the connection ref with the updated weight
            const weightSubscription = networkObservable
                .pipe(filter(event => event.type === CONNECTION_WEIGHT))
                .subscribe({
                    next: event => {
                        const weight = event.payload as ConnectionWeight
                        // todo convert connectionsRef to a hashmap for quicker look up
                        const index = connectionsRef.current
                            .findIndex(info => info.preSynaptic.name === weight.sourceId && info.postSynaptic.name === weight.neuronId)
                        if (index > 0) {
                            connectionsRef.current[index].weight = weight.newWeight;
                        }
                    },
                    error: error => console.error(error),
                    complete: () => console.log("complete")
                })

            return () => {
                spikesSubscription.unsubscribe();
                weightSubscription.unsubscribe();
            }
        },
        [networkObservable]
    )

    return null;
}

export default Connections;