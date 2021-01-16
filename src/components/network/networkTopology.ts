import {Either, HashMap} from "prelude-ts";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from "../visualization/neuralthree/Connections";
import {coordinate, Coordinate} from "../visualization/basethree/Coordinate";
import {connectionKey} from "../redux/reducers/networkEvent";

const NEURON = 'NRN';
const NEURON_LOCATION = 'LOC';
const CONNECTION = 'CON'

interface ParsedConnectionInfo {
    preSynaptic: string;
    postSynaptic: string;
    weight: number;
}

interface ParsedTopology {
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ParsedConnectionInfo>;
}

export interface NetworkTopology {
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;
}

/**
 * Parses the network description into the topology for displaying in the visualization
 * @param networkDescription The network description
 * @return
 */
export function networkTopology(networkDescription: string): Either<string, NetworkTopology> {
    return parseDescription(cleanDescription(networkDescription))
        .flatMap(parsed => resolveConnections(parsed));
}

function emptyNetworkTopology(): ParsedTopology {
    return {
        neurons: HashMap.of<string, NeuronInfo>(),
        connections: HashMap.of<string, ParsedConnectionInfo>()
    }
}

/**
 * Removes comments, spaces, new-lines to make the parsing easier
 * @param description The network description
 * @return A cleaned network description
 */
function cleanDescription(description: string): string {
    return description
        // strip trailing comments
        .replace(/[,]+([\n\r]])+/g, '')
        // string comments
        .replace(/\*(.*?)[\r\n]*(.*?)\*/, '')
        .replace(/\/\/[^\r\n]*/g, '')
        // strip white spaces from the description
        .replace(/\s/g, '')
}

function parseDescription(
    description: string,
    topology = emptyNetworkTopology(),
    cursor = 0
): Either<string, ParsedTopology> {
    const connectionIndex = description.indexOf(`${CONNECTION}=[`, cursor);
    const neuronIndex = description.indexOf(`${NEURON}=[`, cursor);
    if (cursor === -1 || (connectionIndex === -1 && neuronIndex === -1)) {
        return Either.right(topology)
    }

    // when no more connections or connection section comes after the neuron section, then
    // parse the neurons
    if (connectionIndex === -1 || (neuronIndex > -1 && neuronIndex < connectionIndex)) {
        return parseNeurons(description, topology, neuronIndex)
            .flatMap(({topology: newTopology, neuronsEnd}) =>
                parseDescription(description, newTopology, neuronsEnd)
            )
    }

    if (neuronIndex === -1 || (connectionIndex > -1 && connectionIndex < neuronIndex)) {
        return parseConnections(description, topology, connectionIndex)
            .flatMap(({topology: newTopology, connectionEnd}) =>
                parseDescription(description, newTopology, connectionEnd)
            );
    }
}

function resolveConnections(topology: ParsedTopology): Either<string, NetworkTopology> {
    const {neurons, connections} = topology;
    try {
        const resolvedConnections: HashMap<string, ConnectionInfo> = connections.mapValues(connection => ({
            preSynaptic: neurons.get(connection.preSynaptic).getOrThrow('neuron not found'),
            postSynaptic: neurons.get(connection.postSynaptic).getOrThrow('neuron not found'),
            weight: connection.weight
        }));
        return Either.right({
            neurons: neurons,
            connections: resolvedConnections,
        });
    } catch(error) {
        return Either.left(error);
    }
}

function parseNeurons(
    description: string,
    topology: ParsedTopology,
    cursor: number
): Either<string, {topology: ParsedTopology, neuronsEnd: number}> {
    const idIndex = description.indexOf('nid=', cursor);
    const typeIndex = description.indexOf('inh=', cursor);
    const locIndex = description.indexOf(`${NEURON_LOCATION}=(`, cursor);
    if (idIndex === -1 || typeIndex === -1 || locIndex === -1) {
        return Either.right({topology, neuronsEnd: cursor});
    }

    // parse out the neuron's name
    const idComma = description.indexOf(',', idIndex + 4);
    if (idComma === -1) {
        return Either.left(`Expected comma; ${description.substring(idIndex, Math.min(description.length, idIndex + 4))}`)
    }
    const neuronId = description.substring(idIndex + 4, idComma);

    // parse out the neuron's type
    const typeComma = description.indexOf(',', typeIndex + 4);
    const neuronType = description.substring(typeIndex + 4, typeComma)

    // parse out the neurons location (starting from the beginning of the neuron
    return parseNeuronLocation(description, locIndex + 5)
        .flatMap(({coords, locationEnd}) => {
            const info: NeuronInfo = {
                name: neuronId,
                type: neuronType === 'f' ? 'e' : 'i',
                coords: coords
            }

            const newTopology = {
                ...topology,
                neurons: topology.neurons.put(neuronId, info)
            };

            return parseNeurons(description, newTopology, Math.max(idComma, typeComma, locationEnd));
        })
}

function parseNeuronLocation(
    description: string,
    cursor: number
): Either<string, {coords: Coordinate, locationEnd: number}> {
    const endIndex = description.indexOf(')', cursor);
    const location = description.substring(cursor, endIndex);
    // todo for now assume that the coords are cartesian
    const matches = Array.from(location.matchAll(/(?:=)([0-9-.]+)/g)).map(value => parseFloat(value[1]))
    const coords = coordinate(matches[0], matches[1], matches[2])
    return Either.right({coords, locationEnd: endIndex})
}

function parseConnections(
    description: string,
    topology: ParsedTopology,
    cursor: number
): Either<string, {topology: ParsedTopology, connectionEnd: number}> {
    const preIndex = description.indexOf('prn=', cursor);
    const postIndex = description.indexOf('psn=', cursor);
    const weightIndex = description.indexOf('cnw=', cursor);
    if (preIndex === -1 || postIndex === -1 || weightIndex === -1) {
        return Either.right({topology, connectionEnd: cursor});
    }

    const weightComma = description.indexOf(',', weightIndex + 4);
    const weight = parseFloat(description.substring(weightIndex + 4, weightComma));

    // find the strings representing the connection
    const regex = /^[a-zA-Z-0-9]+({[0-9,:]*})?[,)]/
    const preConn = description.substring(preIndex + 4).match(regex)[0];
    const postConn = description.substring(postIndex + 4).match(regex)[0];

    // expand the connections, if needed
    const preConns = expandConnection(preConn.substring(0, preConn.length-1));
    const postConns = expandConnection(postConn.substring(0, postConn.length-1));

    const connections: Array<[string, ParsedConnectionInfo]> = preConns
        .flatMap(pre => postConns.map(post => ([pre, post] as [string, string])))
        .map(([pre, post]) => [connectionKey(pre, post), {
            preSynaptic: pre,
            postSynaptic: post,
            weight: weight
        } as ParsedConnectionInfo])

    const newTopology = {
        ...topology,
        connections: topology.connections.mergeWith(connections, (v1, v2) => v2)
    }

    const newCursor = Math.max(
        preIndex + 4 + preConn.length,
        postIndex + 4 + postConn.length
    );
    return parseConnections(description, newTopology, newCursor);
}

function expandConnection(connection: string): Array<string> {
    // if it is a simple connection, then just return it
    if (connection.match(/^[a-zA-Z-0-9]+$/) !== null) {
        return [connection];
    }
    const prefix = connection.match(/^[a-zA-Z-0-9]+/)[0];
    const contractedRegex = /({[0-9,:]*})$/
    const expression = connection.match(contractedRegex)[0].replace(/[{}]/g, '');
    const nums = expression
        .split(',')
        .flatMap(num => {
            if (num.indexOf(':') >= 0) {
                const [start, stop, step] = num.split(':').map(value => parseInt(value));
                const expand: Array<number> = [];
                for (let i = start; i <= stop; i += step) {
                    expand.push(i);
                }
                return expand;
            }
            return [parseInt(num)]
        });
    return nums.map(num => `${prefix}${num}`);
}