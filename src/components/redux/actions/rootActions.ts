import ServerSettings from "../../settings/serverSettings";
// import {networkManagementActionCreators} from "./networkManagement";

/**
 * Generates the wrappers around the action creators that need to know the host and port of the server
 * @param {ServerSettings} serverSettings The host, port, and base URL for making calls to the server
 * @return {{networkDescriptionUpdate: (networkDescription: string) => NetworkDescriptionChangedAction; stopSimulation: (websocket: WebSocketSubject<string>) => ThunkAction<Promise<StopSimulationAction>, any, any, StopSimulationAction>; webSocketSubject: (networkId: string) => CreateWebsocketAction; buildNetwork: (networkDescription: string) => ThunkAction<Promise<NetworkBuiltAction>, any, any, NetworkBuiltAction>; subscribe: (observable: Observable<NetworkEvent>, timeWindow: number, messageProcessor: (messages: NetworkEvent) => void, pauseSubject: Subject<boolean>, paused: boolean) => ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction>; unsubscribe: (subscription: Subscription, pauseSubscription: Subscription) => ThunkAction<Promise<UnsubscribeWebsocketAction>, any, any, UnsubscribeWebsocketAction>; networkEventsObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) => CreateNetworkObservableAction; pauseSimulation: (pause: boolean, pauseSubject: Subject<boolean>) => PauseSimulationAction; loadNetworkDescription: (networkDescriptionFile: File) => ThunkAction<Promise<NetworkDescriptionLoadedAction>, any, any, NetworkDescriptionLoadedAction>; startSimulation: (websocket: WebSocketSubject<string>) => ThunkAction<Promise<StartSimulationAction>, any, any, StartSimulationAction>; deleteNetwork: (networkId: string) => ThunkAction<Promise<NetworkDeletedAction>, any, any, NetworkDeletedAction>}}
 */
export function generateRemoteActionCreators(serverSettings: ServerSettings) {
    return {
        // ...networkManagementActionCreators(serverSettings)
    }
}