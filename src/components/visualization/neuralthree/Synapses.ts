import {ConeGeometry, Mesh, MeshBasicMaterial, MeshBasicMaterialParameters, Vector3} from "three";
import {ConnectionInfo} from "./Connections";
import {ColorRange} from "./Network";
import {useEffect, useRef} from "react";
import {threeRender, useThree} from "../basethree/useThree";
import {ThreeContext} from "../basethree/ThreeJsManager";
import {noop} from "../../../commons";

export interface OwnProps {
    sceneId: string;
    connections: Array<ConnectionInfo>;
    colorRange: ColorRange;
    synapseOffsets?: Array<number>;
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

const meshParameters: MeshBasicMaterialParameters = {
    transparent: true,
    vertexColors: true,
    alphaTest: 0.5,
    color: 'orange'
};

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
    } = props;

    const contextRef = useRef<ThreeContext>();
    const renderRef = useRef<() => void>(noop);
    const geometryRef = useRef<ConeGeometry>(new ConeGeometry(2, 7));
    const materialRef = useRef<MeshBasicMaterial>(new MeshBasicMaterial(meshParameters));
    const conesRef = useRef<Array<Mesh>>(connections.map(connection => createCone(connection, geometryRef.current, materialRef.current)));
    const connectionsRef = useRef<Map<string, number>>(
        new Map(connections.map((info, i) => [connectionKeyFor(info), i]))
    );

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
                    const newCone = createCone(connection, geometryRef.current, materialRef.current);
                    conesRef.current.push(newCone);
                    contextRef.current.scenesContext.addToScene(sceneId, newCone);
                }
            })

        },
        [connections, colorRange]
    );


    // sets up the synapses, and adds them to the network scene
    useThree<Array<Mesh>>((context: ThreeContext): [string, Array<Mesh>] => {
        contextRef.current = context;
        const meshes = conesRef.current.map(cone => context.scenesContext.addToScene(sceneId, cone)[1]);
        return [sceneId, meshes];
    });

    // called when the component is mounted or the context changes to set the render function needed to animate
    // the neurons' spiking
    useEffect(
        () => {
            renderRef.current = () => threeRender(contextRef.current, noop)
        },
        [contextRef.current]
    );
    return null;
}

export default Synapses;