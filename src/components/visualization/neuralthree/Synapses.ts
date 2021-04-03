import {Color, ConeGeometry, Mesh, MeshBasicMaterial, MeshBasicMaterialParameters, Vector3} from "three";
import {ConnectionInfo, outgoingConnectionsFor} from "./Connections";
import {ColorRange} from "./Network";
import {useEffect, useRef} from "react";
import {threeRender, useThree, useThreeContext} from "../basethree/useThree";
import {filter} from "rxjs/operators";
import {NetworkEvent, Spike, SPIKE} from "../../redux/actions/networkEvent";
import {Observable} from "rxjs";
import {UseThreeValues} from "../basethree/ThreeProvider";
import {noop} from "../../../commons";

export interface OwnProps {
    sceneId: string;
    connections: Array<ConnectionInfo>;
    colorRange: ColorRange;
    synapseOffsets?: Array<number>;
    // observable that emits network events upon subscription
    networkObservable: Observable<NetworkEvent>;
    spikeDuration: number;
    spikeColor: Color;
}

const coneUnitVector = new Vector3(0, -1, 0);

/**
 * Calculates a unit vector pointing from the pre-synaptic to the post-synaptic neuron
 * @param connection The connection
 * @return A unit vector pointing from the pre-synaptic to the post-synaptic neuron
 */
function synapseDirection(connection: ConnectionInfo): Vector3 {
    const [x, y, z] = connection.postSynaptic.coords.toArray();
    const [xp, yp, zp] = connection.preSynaptic.coords.toArray();
    return new Vector3().subVectors(new Vector3(xp, yp, zp), new Vector3(x, y, z)).normalize();
}

/**
 * Calculates the synapse's 3-dimensional coordinates
 * @param connection The connection
 * @param direction The direction from the pre-synaptic to the post-synaptic neuron
 * @return A array representing a 3-tuple (x, y, z).
 */
function synapseLocation(connection: ConnectionInfo, direction: Vector3): [x: number, y: number, z: number] {
    const [x, y, z] = connection.postSynaptic.coords.toArray();
    const [xp, yp, zp] = connection.preSynaptic.coords.toArray();
    const distance = Math.min(8, Math.sqrt((x - xp) * (x  - xp) + (y - yp) * (y - yp) + (z - zp) * (z - zp)));
    return [
        x + distance * direction.x,
        y + distance * direction.y,
        z + distance * direction.z
    ];
}

/**
 * Creates a cone representing the synapse, pointing to the post-synaptic neuron from the pre-synaptic neuron.
 * @param connection The connection
 * @param geometry The cone geometry
 * @param material The basic mesh material
 * @return A mesh representing the synapse (cone)
 */
function createCone(connection: ConnectionInfo, geometry: ConeGeometry, material: MeshBasicMaterial): Mesh {
    const direction = synapseDirection(connection);
    const mesh = new Mesh(geometry, material);
    mesh.quaternion.setFromUnitVectors(coneUnitVector, direction);
    mesh.position.fromArray(synapseLocation(connection, direction));
    return mesh
}

/**
 * Creates and returns a key representing a connection
 * @param connection The connection
 * @return A key string representing the connection
 */
function connectionKeyFor(connection: ConnectionInfo): string {
    return `${connection.preSynaptic.name}::${connection.postSynaptic.name}`;
}

/**
 * Returns the mesh's material parameters for the synapse (cone) mesh
 * @param baseColors The base colors (min, max) for the synapse
 * @param excitatory `true` if the pre-synaptic neuron is excitatory; `false` if the neuron is inhibitory
 * @return The parameters for the mesh's material
 */
function meshParametersFor(baseColors: ColorRange, excitatory: boolean): MeshBasicMaterialParameters {
    return {
        transparent: true,
        alphaTest: 0.5,
        color: excitatory ? baseColors.excitatory.max : baseColors.inhibitory.max,
    }
}

/**
 * Function component that represents the synapses. These are a set of dots drawn on the connection line
 * just before the post-synaptic neuron
 * @param props The properties
 * @return Always null, nothing ever returned
 * @constructor
 */
function Synapses(props: OwnProps): null {
    const {
        sceneId,
        connections,
        colorRange,
        networkObservable,
        spikeDuration,
        spikeColor,
    } = props;

    const {addToScene} = useThreeContext();

    const renderRef = useRef<() => void>(noop);
    const geometryRef = useRef<ConeGeometry>(new ConeGeometry(2, 7));
    const materialRef = useRef<Array<MeshBasicMaterial>>(
        connections.map(connection => new MeshBasicMaterial(meshParametersFor(colorRange, connection.preSynaptic.type === 'e')))
    );
    const spikeColorRef = useRef<Color>(spikeColor);
    // holds the cones representing the synapse
    const conesRef = useRef<Array<Mesh>>(
        connections.map((connection, index) => createCone(connection, geometryRef.current, materialRef.current[index]))
    );
    // holds the index into the conesRef for the connection (map(connection_key -> conesRef_index))
    const connectionsRef = useRef<Map<string, number>>(
        new Map(connections.map((info, i) => [connectionKeyFor(info), i]))
    );
    const connectionsInfoRef = useRef<Array<ConnectionInfo>>(connections.slice());

    // called when the connections or the color range are modified to recalculate the synapse colors
    useEffect(
        () => {
            // when the connections (property) length is less than the index map, then connections have been removed,
            // and so we need to remove them from the scene and the index map
            if (connections.length < connectionsRef.current.size) {
                // find any connections that have been removed
                const keys = new Set<string>(connections.map(connection => connectionKeyFor(connection)));
                Array.from(connectionsRef.current.keys()).forEach(key => {
                    if (keys.has(key)) {
                        keys.delete(key);
                    }
                })
                // for any of the connections that have been removed, remove the cone (mesh) form the
                // array of cones
                keys.forEach(key => {
                    conesRef.current.splice(connectionsRef.current.get(key), 1);
                });
            }

            // for each existing connection update possible changes in position or direction. and add any
            // new connections
            connections.forEach((connection, i) => {
                const key = connectionKeyFor(connection);
                // update position and direction changes
                if (connectionsRef.current.has(key)) {
                    const direction = synapseDirection(connection);
                    conesRef.current[i].position.fromArray(synapseLocation(connection, direction));
                    conesRef.current[i].quaternion.setFromUnitVectors(coneUnitVector, direction);
                }
                // add new synapse (cone)
                else {
                    connectionsRef.current.set(key, conesRef.current.length);
                    const newCone = createCone(connection, geometryRef.current, materialRef.current[i]);
                    conesRef.current.push(newCone);
                    addToScene(sceneId, newCone);
                }
            })

            connectionsInfoRef.current = connections.slice()
        },
        [connections, colorRange]
    );

    // when the theme has changed, the spike color will also have changed, so update it
    useEffect(
        () => {
            spikeColorRef.current = spikeColor;
        },
        [spikeColor]
    )

    // sets up the synapses, and adds them to the network scene
    const {context} = useThree<Array<Mesh>>(() => [sceneId, conesRef.current])

    // called when the component is mounted or the context changes to set the render function needed to animate
    // the neurons' spiking
    useEffect(
        () => {
            renderRef.current = () => threeRender(context, noop)
        },
        [context]
    );

    /**
     * Function that changes the color of the synapse to it's spiking color, calling itself after the spiking
     * duration to return the color back to it's pre-spiking color.
     * @param spikingConnections The connections emanating from the spiking pre-synaptic neuron
     * @param spiking `true` if spiking; `false` if done spiking
     */
    function animateSpike(spikingConnections: Array<ConnectionInfo>, spiking: boolean): void {
        updateSynapseColors(spikingConnections, spiking);

        // render the scene with three-js
        // render();
        renderRef.current();

        // if spiking, then call this function again after a delay to set the neuron's color back to
        // its original value
        if(spiking) {
            setTimeout(
                () => requestAnimationFrame(
                    () => animateSpike(spikingConnections, false)
                ),
                spikeDuration
            );
        }
    }

    /**
     * Updates the synapse colors, given the neuron is spiking, or not spiking and excitatory or inhibitory.
     * @param connections An array of the connection information for the spiking (or done spiking) neurons
     * @param spiking `true` if the neuron is spiking; `false` if the neuron is just done spiking
     */
    function updateSynapseColors(connections: Array<ConnectionInfo>, spiking: boolean): void {
        connections.forEach(connection => {
            const conesIndex = connectionsRef.current.get(connectionKeyFor(connection));
            if (conesIndex !== undefined) {
                const material = conesRef.current[conesIndex].material as MeshBasicMaterial;
                if (spiking) {
                    material.color = spikeColorRef.current;
                } else {
                    material.color = connection.preSynaptic.type === 'e' ? colorRange.excitatory.max : colorRange.inhibitory.max;
                }
            }
        })
    }

    useEffect(
        () => {
            const subscription = networkObservable
                .pipe(filter(event => event.type === SPIKE))
                .subscribe({
                    next: event => {
                        if (context && conesRef.current) {
                            const spikingConnections = outgoingConnectionsFor((event.payload as Spike).neuronId, connectionsInfoRef.current)
                                .map(([, info]) => info)
                                // .map(([, info]) => connectionKeyFor(info))

                            // flash the connections
                            animateSpike(spikingConnections, true);
                        }
                    },
                    error: error => console.error(error),
                    complete: () => console.log("complete")
                });

            return () => {
                subscription.unsubscribe();
            }
        },
        [networkObservable]
    )

    // nothing to return
    return null;
}

export default Synapses;