import {Observable as FnsObservable} from 'observable-fns';
import {Observable} from "rxjs";
import {NetworkEvent} from "../redux/actions/networkEvent";
import {spawn, Thread, Worker} from "threads";
import {ObservablePromise} from "threads/dist/observable-promise";
import {ModuleMethods, ModuleProxy, PrivateThreadProps, StripAsync} from "threads/dist/types/master";
import {remoteRepositories} from "../../app";

type NetworkManagerWorker = ((() => ObservablePromise<StripAsync<NetworkEvent>>) & PrivateThreadProps & ModuleProxy<ModuleMethods>) ;

export interface NetworkManagerThread {
    deploy: (networkDescription: string) => Promise<string>;
    build: (networkId: string) => Promise<Observable<NetworkEvent>>;
    start: (sensorDescription: string, timeFactor: number) => Promise<Observable<NetworkEvent>>;
    stop: () => Promise<void>;
    remove: () => Promise<string>;
    terminate: () => Promise<void>;
}

/**
 * Creates a new network manager thread for deploying, building, starting, stopping and
 * removing networks.
 * @return A promise the functions for managing the network.
 */
export async function newNetworkManagerThread(): Promise<NetworkManagerThread> {

    // spawn a new worker that handles all the websocket stuff
    const worker: NetworkManagerWorker = await spawn(new Worker('../workers/networkManager'));
    await worker.configure(remoteRepositories.serverSettings)

    /**
     * Attempts to deploy the network to the backend
     * @param networkDescription The description (DNA) of the network
     * @return A promise holding the ID of the deployed network
     */
    async function deploy(networkDescription: string): Promise<string> {
        return worker.deployNetwork(networkDescription);
    }

    /**
     * Attempts to build the network on the back end, sending network events describing the
     * build of the network.
     * @return A promise to an observable of network build events
     */
    async function build(): Promise<Observable<NetworkEvent>> {
        console.log("attempting to build network")
        // const buildEvents: FnsObservable<NetworkEvent> = await worker.buildNetwork();
        await worker.buildNetwork();
        console.log("network built")
        const buildEvents: FnsObservable<NetworkEvent> = worker.buildObservable();
        console.log("got build-events observable");
        // convert the fns-observable to a rxjs observable
        return new Observable<NetworkEvent>(
            observer => buildEvents.subscribe(event => {
                console.log(event);
                observer.next(event)
            })
        );
    }

    /**
     * Attempts to start the network simulation by adding a sensor and sending the sensor signals
     * to the network.
     * @param sensorDescription The sensor description code snippet
     * @param timeFactor The simulation time factor
     * @return A promise to an observable of network events
     */
    async function start(sensorDescription: string, timeFactor: number): Promise<Observable<NetworkEvent>> {
        const networkEvents: FnsObservable<NetworkEvent> = await worker.startNetwork(sensorDescription, timeFactor);
        // convert the fns-observable to a rxjs observable
        return new Observable<NetworkEvent>(
            observer => networkEvents.subscribe(event => observer.next(event))
        );
    }

    /**
     * Attempts to stop the sensor signals from being sent to the network
     * @return As in life, so many times, an empty promise
     */
    async function stop(): Promise<void> {
        return worker.stopNetwork();
    }

    /**
     * Attempts to remove/delete the network from the back end
     * @return A promise with the ID of the network that was deleted
     */
    async function remove(): Promise<string> {
        return worker.deleteNetwork();
    }

    async function terminate(): Promise<void> {
        return Thread.terminate(worker);
    }

    return {
        deploy,
        build,
        start,
        stop,
        remove,
        terminate,
    }
}
