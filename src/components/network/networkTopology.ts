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

interface LocationParseResult {
    coords: Coordinate;
    locationEnd: number;
}

interface ConnectionParseResult {
    topology: ParsedTopology;
    connectionEnd: number;
}

export interface NetworkTopology {
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;
}

/**
 * Parses the network description into the topology for displaying in the visualization
 * @param networkDescription The network description to be parsed
 * @return Either the network topology or a string describing the encountered error
 */
export function networkTopology(networkDescription: string): Either<string, NetworkTopology> {
    return parseDescription(cleanDescription(networkDescription))
        .flatMap(parsed => resolveConnections(parsed));
}

/**
 * @return an empty network topology with parsed (rather than resolved) neuron connections
 */
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

/**
 * For each connect, replaces the pre- and post-synaptic neuron ID with the neuron information.
 * @param topology The parsed network topology
 * @return Either the resolved network topology or a string with an error message
 */
function resolveConnections(topology: ParsedTopology): Either<string, NetworkTopology> {
    const {neurons, connections} = topology;
    try {
        const resolvedConnections: HashMap<string, ConnectionInfo> = connections.mapValues(connection => ({
            preSynaptic: neurons
                .get(connection.preSynaptic)
                .getOrThrow(`Resolve error: pre-synaptic neuron not found ${connection.preSynaptic}`),
            postSynaptic: neurons
                .get(connection.postSynaptic)
                .getOrThrow(`Resolve error: post-synaptic neuron not found ${connection.postSynaptic}`),
            weight: connection.weight
        }));
        return Either.right({neurons: neurons, connections: resolvedConnections});
    } catch(error) {
        return Either.left(error);
    }
}

/**
 * Recursive function that parses the network description. This function represents that actual parser.
 * When called initially, the parser is in the "description" state. When the parser encounters either a
 * 'NRN' or a 'CON', it switches states by calling the `parseNeurons` or `parseConnections` functions.
 * @param description The (cleaned) network description
 * @param topology The current parsed network topology
 * @param cursor The current index into the description (i.e. the current location of the parser)
 * @return Either the parse network topology or a string describing the encountered error
 */
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
                // recursive call
                parseDescription(description, newTopology, neuronsEnd)
            )
    }

    // when no more neurons or neuron section comes after the connections, the parse the
    // connections
    if (neuronIndex === -1 || (connectionIndex > -1 && connectionIndex < neuronIndex)) {
        return parseConnections(description, topology, connectionIndex)
            .flatMap(({topology: newTopology, connectionEnd}) =>
                // recursive call
                parseDescription(description, newTopology, connectionEnd)
            );
    }
}

/**
 * Recursive function that parses the neuron section. When called, the parse is in the "neuron" state.
 * This function works through the list of neurons, and when exhausted, returns the parsed topology back to the
 * "description" state.
 * @param description The (cleaned) network description
 * @param topology The current parsed network topology
 * @param cursor The current index into the description (i.e. the current location of the parser)
 * @return Either the parse network topology or a string describing the encountered error
 */
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
        return Either.left(
            `Parse neurons error: expected comma after neuron ID; ${description.substring(idIndex, Math.min(description.length, idIndex + 4))}`
        );
    }
    const neuronId = description.substring(idIndex + 4, idComma);

    // parse out the neuron's type
    const typeComma = description.indexOf(',', typeIndex + 4);
    if (typeComma === -1) {
        return Either.left(
            `Parse neurons error: expected comma after neuron type; ${description.substring(typeIndex, Math.min(description.length, typeIndex + 4))}`
        );
    }
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

            // recursive call
            return parseNeurons(description, newTopology, Math.max(idComma, typeComma, locationEnd));
        })
}

/**
 * todo add logic to process units
 * todo add logic to convert from different coordinate systems
 * Parses the neurons location into a coordinate.
 * @param description The (cleaned) network description
 * @param cursor The current index into the description (i.e. the current location of the parser)
 * @return Either an object holding the coordinates and the end of the location section, or a string
 * describing the encountered error.
 */
function parseNeuronLocation(description: string, cursor: number): Either<string, LocationParseResult> {
    return findValueFor('cst', description, cursor).flatMap(coordinateSystem => {
        const endIndex = description.indexOf(')', cursor);
        if (endIndex === -1) {
            return Either.left(`Parse neuron location error: expected ')' after neuron coordinates; ${description.substring(cursor, Math.min(description.length, endIndex))}`);
        }

        const location = description.substring(cursor, endIndex);
        const matches = Array.from(location.matchAll(/(?:=)([0-9-.]+(nm|µm|mm)?)/g)).map(value => standardizeCoordinateUnits(value[1]))
        if (matches === null || matches.length !== 3) {
            return Either.left(`Parse neuron location error: unable to parse neuron coordinates; ${description.substring(cursor, Math.min(description.length, endIndex))}`);
        }
        // const coords = coordinate(matches[0], matches[1], matches[2])

        // convert coordinate system to cartesian
        const coords = convertToCartesian(coordinateSystem.value, [matches[0], matches[1], matches[2]])

        return Either.right({coords, locationEnd: endIndex})
    })
}

/**
 * Recursive function that parse the connection section. When this function is called, the parser enters
 * the "connection" state. This function works through the list of connections, and when exhausted,
 * returns the parsed topology back to the "description" state.
 * @param description The (cleaned) network description
 * @param topology The current parsed network topology
 * @param cursor The current index into the description (i.e. the current location of the parser)
 * @return Either the parsed network topology or a string describing the encountered error
 */
function parseConnections(description: string, topology: ParsedTopology, cursor: number): Either<string, ConnectionParseResult> {
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

/**
 * Expands the connection when it is an expression. For example, the connection ID for the pre- or
 * post-synaptic neuron could be `in-{1:6:2, 4}` which would expand to `in-1`, `in-3`, `in-5`, `in-4`.
 * @param connection The connection or connection expression
 * @return The expanded connection as an array of connection IDs.
 */
function expandConnection(connection: string): Array<string> {
    // if it is a simple connection, then just return it
    if (connection.match(/^[a-zA-Z-0-9]+$/) !== null) {
        return [connection];
    }

    // if it is a connection expression, then expand it
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

function findKeyValueEnd(description: string, cursor: number): number {
    const end = description.indexOf(',', cursor);
    if (end >= 0) {
        return end;
    }
    return description.indexOf(')', cursor);
}

interface ValueResult {
    value: string;
    endIndex: number;
}

function findValueFor(key: string, description: string, cursor: number): Either<string, ValueResult> {
    const startIndex = description.indexOf(`${key}=`, cursor);
    if (startIndex === -1) {
        return Either.left(
            `Parse error; failed to parse key-value pairs because key could not be found; key=${key}; ...${description.substring(cursor, cursor + 10)}...`
        );
    }
    const endIndex = findKeyValueEnd(description, startIndex + 4);
    if (endIndex === -1) {
        return Either.left(
            `Parse error; failed to parse key-value pairs because ending comma or parens could not be found; key=${key}; ...${description.substring(cursor, cursor + 10)}...`
        );
    }
    const value = description.substring(startIndex + 4, endIndex);
    return Either.right({value, endIndex});
}

/**
 * Converts all the coordinates' units to µm.
 * @param value The value to convert
 * @return The value converted to µm
 */
function standardizeCoordinateUnits(value: string): number {
    if (value.endsWith('nm')) {
        return parseFloat(value.substring(0, value.length-2)) / 1000;
    }
    if (value.endsWith('µm')) {
        return parseFloat(value.substring(0, value.length-2));
    }
    if (value.endsWith('mm')) {
        return parseFloat(value.substring(0, value.length-2)) * 1000;
    }
    return parseFloat(value);
}

/**
 * Converts the coordinates from the specified coordinate system to the cartesian coordinate system
 * @param coordinateSystem The coordinate system (i.e. cartesian, cylindrical, spherical)
 * @param coords The coordinates to convert
 * @return The cartesian coordinates
 */
function convertToCartesian(coordinateSystem: string, coords: [number, number, number]): Coordinate {
    const [px1, px2, px3] = coords;
    switch(coordinateSystem) {
        // cylindrical (r, φ, z)
        case 'cl':
            return coordinate(
                px1 * Math.cos(px2),
                px1 * Math.sin(px2),
                px3
            )
        // spherical (r, φ, θ)
        case 'sp':
            return coordinate(
                px1 * Math.cos(px2) * Math.sin(px3),
                px1 * Math.sin(px2) * Math.sin(px3),
                px1 * Math.cos(px3)
            )
        // cartesian (x, y, z)
        case 'ct':
        default:
            return coordinate(px1, px2, px3);
    }
}
