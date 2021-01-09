import {BufferAttribute, BufferGeometry, Points, PointsMaterial, Vector3, VertexColors} from "three";
import {ConnectionInfo} from "./Connections";
import {ColorRange} from "./Network";
import {useEffect, useState} from "react";
import {useThree} from "../basethree/useThree";
import {ThreeContext} from "../basethree/ThreeJsManager";

export interface OwnProps {
    sceneId: string;
    connections: Array<ConnectionInfo>;
    colorRange: ColorRange;
    synapseOffsets?: Array<number>;
}

/**
 * Creates the points representing the synapse. One point is drawn at an offset from the post-synaptic neuron,
 * along the connection, for each specified synapse offset.
 * @param {[ConnectionInfo]} connections The array holding the pre- and post-synaptic neuron information
 * @param {[number]} synapseOffsets The offset amount for each point used to represent the synapse
 * @return {Float32Array} The array holding the flatten synapse positions. The length of the array, which depends
 * on the number of specified synapse offset, is 3 times the number of connections times the number of offsets
 */
function synapsePositionsFrom(connections: Array<ConnectionInfo>, synapseOffsets: Array<number>) {
    function setSynapsePosition(connectionId: number, connection: ConnectionInfo, positions: Float32Array, offsets: Array<number>) {
        const [x, y, z] = connection.postSynaptic.coords.toArray();
        const [xp, yp, zp] = connection.preSynaptic.coords.toArray();
        const direction = new Vector3().subVectors(new Vector3(xp, yp, zp), new Vector3(x, y, z)).normalize();
        for (let i = 0; i < offsets.length; ++i) {
            positions[(connectionId * offsets.length + i) * 3] = x + offsets[i] * direction.x;
            positions[(connectionId * offsets.length + i) * 3 + 1] = y + offsets[i] * direction.y;
            positions[(connectionId * offsets.length + i) * 3 + 2] = z + offsets[i] * direction.z;
        }
    }

    const synapsePos = new Float32Array(connections.length * 3 * synapseOffsets.length);
    connections.forEach((connection, i) => setSynapsePosition(i, connection, synapsePos, synapseOffsets));
    return synapsePos;
}

/**
 * Creates the array of synapse colors for each point representing a synapse. The colors for the synapse
 * depend on the pre-synaptic neuron's type (i.e. excitatory, inhibitory)
 * @param {[ConnectionInfo]} connections The array holding the pre- and post-synaptic neuron information
 * @param {[number]} synapseOffsets The offset amount for each point used to represent the synapse
 * @param {ColorRange} baseColors The colors for calculating the weight adjusted color
 * @return {Float32Array} The array holding the flatten synapse positions. The length of the array, which depends
 * on the number of specified synapse offset, is 3 times the number of connections times the number of offsets
 */
function synapseColorsFrom(connections: Array<ConnectionInfo>, synapseOffsets: Array<number>, baseColors: ColorRange) {
    function setSynapseColors(synapseId: number, neuronType: string, colors: Float32Array, numOffsets: number) {
        const color = neuronType === 'e' ? baseColors.excitatory.max : baseColors.inhibitory.max;
        for (let i = 0; i < numOffsets; ++i) {
            colors[(synapseId * numOffsets + i) * 3] = color.r;
            colors[(synapseId * numOffsets + i) * 3 + 1] = color.g;
            colors[(synapseId * numOffsets + i) * 3 + 2] = color.b;
        }
    }

    const synapseColors = new Float32Array(connections.length * 3 * synapseOffsets.length);
    connections.forEach((connection, i) => setSynapseColors(i, connection.preSynaptic.type, synapseColors, synapseOffsets.length));
    return synapseColors;
}

/**
 * Function component that represents the synapses. These are a set of dots drawn on the connection line
 * just before the post-synaptic neuron
 * @param {OwnProps} props The properties
 * @return {null} Always null, nothing ever returned
 * @constructor
 */
function Synapses(props: OwnProps): null {
    const {sceneId, connections, colorRange, synapseOffsets=[1, 2, 4]} = props;

    const [synapsePositions, setSynapsePositions] = useState<Float32Array>(synapsePositionsFrom(connections, synapseOffsets));
    const [synapseColors, setSynapseColors] = useState<Float32Array>(synapseColorsFrom(connections, synapseOffsets, colorRange));

    // called when the connections are modified to recalculate the synapse positions
    useEffect(
        () => setSynapsePositions(synapsePositionsFrom(connections, synapseOffsets)),
        [connections]
    );

    // called when the connections or the color range are modified to recalculate the synapse colors
    useEffect(
        () => setSynapseColors(synapseColorsFrom(connections, synapseOffsets, colorRange)),
        [connections, colorRange]
    );

    // sets up the synapses, and adds them to the network scene
    useThree<Points>((context: ThreeContext): [string, Points] => {
        const {scenesContext} = context;

        const numConnections = connections.length;
        const geometry = new BufferGeometry();
        geometry.setDrawRange(0, numConnections * synapseOffsets.length);
        geometry.setAttribute('position', new BufferAttribute(synapsePositions, 3));
        geometry.setAttribute('color', new BufferAttribute(synapseColors, 3));

        const material = new PointsMaterial({
            color: VertexColors,
            vertexColors: true,
            size: 4,
            // blending: AdditiveBlending,
            transparent: false,
            sizeAttenuation: false
        });

        return scenesContext.addToScene(sceneId, new Points(geometry, material));
    });

    return null;
}

export default Synapses;