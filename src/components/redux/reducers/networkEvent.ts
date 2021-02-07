import {
    asCoordinate,
    BUILD_ACTIONS,
    DELETE_NETWORK,
    NETWORK_CREATED, NETWORK_TOPOLOGY_UPDATED,
    NetworkEventAction,
    NetworkEventsAction,
    Neuron,
    NEURON_CONNECTED,
    NEURON_CREATED,
} from '../actions/networkEvent';
import {HashMap} from "prelude-ts";
import {NeuronInfo} from "../../visualization/neuralthree/Neurons";
import {ConnectionInfo} from "../../visualization/neuralthree/Connections";

interface NetworkState {
    /**
     * map(neuron-id -> neuron-info)
     * Maps the neuron ID to the neuron information
     */
    neurons: HashMap<string, NeuronInfo>;

    /**
     * map(connectionKey(pre, post) -> connection)
     * Maps the connection key to the connection information. The connection key is a string based on the
     * pre-synaptic and post-synaptic neuron IDs
     */
    connections: HashMap<string, ConnectionInfo>;

    /**
     * Whether the current network is built
     */
    networkBuilt: boolean;
}

const initialState: NetworkState = {
    neurons: HashMap.empty(),
    connections: HashMap.empty(),
    networkBuilt: false
};

export const connectionKey = (preSynapticId: string, postSynapticId: string): string => `${preSynapticId}-${postSynapticId}`;

/**
 * Converts the [[Neuron | neuron]] into a [[NeuronInfo | neuron-info]] object
 * @param {Neuron} neuron The neuron to convert
 * @return {NeuronInfo} The neuron info object
 */
function convertNeuron(neuron: Neuron): NeuronInfo {
    return {
        name: neuron.neuronId,
        type: neuron.inhibitory ? 'i' : 'e',
        coords: asCoordinate(neuron.location)
    }
}

function retrieveNeuronInfo(neuronId: string, neurons: HashMap<string, NeuronInfo>): NeuronInfo {
    return neurons.get(neuronId).getOrThrow(`Neuron ${neuronId} not found`);
}

/**
 * Creates a connection-info object for the connection between the pre-synaptic neuron ID and the post-synaptic neuron ID,
 * that has the specified connection weight.
 * @param {string} preSynapticId The ID of the pre-synaptic neuron
 * @param {string} postSynapticId The ID of the post-synaptic neuron
 * @param {number} weight The connection weight
 * @param {HashMap<string, NeuronInfo>} neurons A map holding the neurons' information associated with their ID
 * @return {ConnectionInfo} The connection information object holding the pre- and post-synaptic neurons and the
 * connection weight.
 */
function connectionFrom(preSynapticId: string, postSynapticId: string, weight: number, neurons: HashMap<string, NeuronInfo>): ConnectionInfo {
    return {
        preSynaptic: retrieveNeuronInfo(preSynapticId, neurons),
        postSynaptic: retrieveNeuronInfo(postSynapticId, neurons),
        weight: weight
    };
}

/**
 * Returns an updated state based on the current state and a network event. For example, when a neuron is created
 * updates the topology with the new neuron. Or, for example, when two neurons are connected, then updates the
 * connections.
 * @param {NetworkState} state The current network state
 * @param {NetworkEventAction} action The network event action.
 * @return {NetworkState} An updated network state
 */
export function networkEventReducer(state: NetworkState = initialState,
                                    action: NetworkEventAction | NetworkEventsAction): NetworkState {
    switch (action.type) {
        case NEURON_CREATED:
            return {
                ...state,
                neurons: state.neurons.put(action.neuron.neuronId, convertNeuron(action.neuron))
            };

        case NEURON_CONNECTED: {
            const {preSynaptic, postSynaptic, initialWeight} = action.connection;
            return {
                ...state,
                connections: state.connections.put(
                    connectionKey(preSynaptic, postSynaptic),
                    connectionFrom(preSynaptic, postSynaptic, initialWeight, state.neurons)
                )
            };
        }

        case NETWORK_CREATED:
            return {
                ...state,
                networkBuilt: true
            }

        case DELETE_NETWORK:
            return initialState;

        case BUILD_ACTIONS:
            return action.events.reduce(
                (accState: NetworkState, action: NetworkEventAction) => networkEventReducer(accState, action),
                state
            );

        case NETWORK_TOPOLOGY_UPDATED:
            return {
                ...state,
                neurons: action.topology.neurons,
                connections: action.topology.connections
            }

        default:
            return state;
    }
}
