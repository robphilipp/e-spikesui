/**
 * Actions for managing network events. These are the spikes-network events that
 * are flowed through the websocket to trigger actions for the UI. For example,
 * when a neuron spikes, a `fire` event is sent down the websocket, and so a
 * fire action is triggered in the message processor. Any UI element listening for
 * fire actions, will receive updates.
 */

/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */

import {Coordinate, coordinateFrom} from "../../visualization/basethree/Coordinate";
import {NetworkTopology} from "../../network/networkTopology";

export const NEURON_CREATED = 'neuron-created';
export const NEURON_CONNECTED = 'neuron-connected';
export const BUILD_ACTIONS = 'network-build-actions';
export const NETWORK_CREATED = 'network-created';
export const DELETE_NETWORK = 'delete-network';
export const EMPTY = 'empty-network-action';

export const NETWORK_TOPOLOGY_UPDATED = 'network-topology-updated';

/*
 |
 | Helpers
 |
 */
export const NEURON = 'neuron';
export const CONNECTION = 'connection';
export const CONNECTION_WEIGHT = 'learn';
export const SPIKE = 'fire';
export const NETWORK = 'networkCreated';

export interface Location {
    units: string;
    x: number;
    y: number;
    z: number;
}

export interface EventTime {
    units: "µs" | "ms" | "s";
    value: number;
}

export interface SignalIntensity {
    units: "µV" | "mV";
    value: number;
}

/**
 * Converts a Location (with dimensions) to a Coordinate (dimensionless, implicit µm)
 * @param {Location} location The location to convert
 * @return {Coordinate} The coordinate where the implicit units are µm
 */
export function asCoordinate(location: Location): Coordinate {

    function convert(location: Location, multiplier: number): Coordinate {
        return coordinateFrom(location.x * multiplier, location.y * multiplier, location.z * multiplier);
    }

    switch (location.units) {
        case 'nm':
            return convert(location, 0.001);

        case 'µm':
            return convert(location, 1);

        case 'mm':
            return convert(location, 1000);

        default:
            return convert(location, 1);
    }
}

/**
 * Converts the event time to milliseconds
 * @param {EventTime} eventTime The event time
 * @return {number} The numver of milliseconds represented by the event time
 */
export function asMilliseconds(eventTime: EventTime): number {
    switch (eventTime.units) {
        case 'µs':
            return eventTime.value / 1000;

        case 'ms':
            return eventTime.value;

        case 's':
            return eventTime.value * 1000;
    }
}

export function asMillivolts(signal: SignalIntensity): number {
    switch (signal.units) {
        case "µV":
            return signal.value / 1000;

        case "mV":
            return signal.value;
    }
}

export interface Neuron {
    neuronId: string;
    neuronType: string;
    inhibitory: boolean;
    location: Location;
}

export interface Connection {
    preSynaptic: string,
    postSynaptic: string,
    preSynapticLocation: Location,
    postSynapticLocation: Location,
    initialWeight: number,
    equilibriumWeight: number,
    distance: number
}

export interface Spike {
    neuronId: string;
    timestamp: EventTime;
    signalIntensity: SignalIntensity;
    lastFireTime: EventTime;
}

export interface Network {
    networkId: string;
}

export interface ConnectionWeight {
    // post-synaptic neuron
    neuronId: string;
    // pre-synaptic neuron
    sourceId: string;
    // the (simulation) time of the signal that caused the connection weight to be updated
    signalTime: EventTime;
    // updated weight
    newWeight: number;
    // previous weight
    previousWeight: number;
    // change in weight
    adjustment: number;
    // STDP time
    stdpTime: EventTime;
    // STDP time window
    timeWindow: EventTime;
}

export interface NetworkEvent {
    type: string;
    payload: Neuron | Connection | ConnectionWeight | Spike | Network;
}

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

/**
 * Event emitted by the spikes network when a neuron is created.
 */
export interface NeuronCreatedAction {
    type: typeof NEURON_CREATED;
    neuron: Neuron;
}

/**
 * Event emitted by the spikes network when two neurons are connected.
 */
export interface NeuronConnectedAction {
    type: typeof NEURON_CONNECTED;
    connection: Connection;
}

export interface NetworkCreatedAction {
    type: typeof NETWORK_CREATED;
    network: Network;
}

export interface DeleteNetworkAction {
    type: typeof DELETE_NETWORK;
}

export interface EmptyNetworkAction {
    type: typeof EMPTY;
}

export interface NetworkTopologyUpdated {
    type: typeof NETWORK_TOPOLOGY_UPDATED;
    topology: NetworkTopology;
}

export type NetworkEventAction = NeuronCreatedAction
    | NeuronConnectedAction
    | NetworkCreatedAction
    | DeleteNetworkAction
    | EmptyNetworkAction
    | NetworkTopologyUpdated
    ;

export interface NetworkEventsAction {
    type: typeof BUILD_ACTIONS;
    events: Array<NetworkEventAction>;
}

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

/**
 * Action creator representing a neuron-created event
 * @param {Neuron} neuron The neuron
 * @return {NeuronCreatedAction} The action representing a created neuron
 */
export function neuronCreated(neuron: Neuron): NeuronCreatedAction {
    return ({
        type: NEURON_CREATED,
        neuron: neuron
    });
}

/**
 * Action creator representing the connection of two neurons
 * @param {Connection} connection The connection
 * @return {NeuronConnectedAction} The action representing the connection of two neurons
 */
export function connectionCreated(connection: Connection): NeuronConnectedAction {
    return ({
        type: NEURON_CONNECTED,
        connection: connection
    });
}

export function networkCreated(network: Network): NetworkCreatedAction {
    return ({
        type: NETWORK_CREATED,
        network: network
    })
}

export function deleteNetwork(): DeleteNetworkAction {
    return ({
        type: DELETE_NETWORK
    })
}

/**
 * More general action creator that creates an action based on the specified event
 * @param {Array<NetworkEvent>} events An array of network events that holds the event type and the payload
 * @return {NetworkEventAction | undefined} The action object, or an undefined if the event type
 * is not a valid event.
 */
export function networkBuildEventsActionCreator(events: Array<NetworkEvent>): NetworkEventsAction {
    return {
        type: BUILD_ACTIONS,
        events: events
            .map(event => {
                switch (event.type) {
                    case NEURON:
                        return neuronCreated(event.payload as Neuron);

                    case CONNECTION:
                        return connectionCreated(event.payload as Connection);

                    case NETWORK:
                        return networkCreated(event.payload as Network)

                    case DELETE_NETWORK:
                        return deleteNetwork();

                    default:
                        return {type: EMPTY} as NetworkEventAction;
                }
            })
            .filter(action => action.type !== EMPTY)
    }
}

export function updateNetworkTopology(topology: NetworkTopology): NetworkTopologyUpdated {
    return {
        type: NETWORK_TOPOLOGY_UPDATED,
        topology,
    }
}
