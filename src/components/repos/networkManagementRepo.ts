import ServerSettings from "../settings/serverSettings";
import axios from "axios";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {webSocket} from "rxjs/webSocket";

export interface NetworkManagementRepo {
    buildNetwork: (networkDescription: string) => Promise<string>;
    deleteNetwork: (networkId: string) => Promise<string>;
    webSocketFor: (networkId: string) => WebSocket;
    webSocketSubjectFor: (networkId: string) => WebSocketSubject<string>;
}

/**
 * Creates a network management repository for building and deleting networks from the server, and retrieving
 * the web-socket for simulation events. Forms a closure on the REST endpoint and the web-socket endpoint.
 * @param serverSettings The server settings holding the server address
 * @return A network management repository
 */
export function networkManagementRepo(serverSettings: ServerSettings): NetworkManagementRepo {
    const baseUrl = `http://${serverSettings.host}:${serverSettings.port}/network-management/network`;
    const baseWebSocketUrl = `ws://${serverSettings.host}:${serverSettings.port}/web-socket`

    /**
     * Deploys the network to the server and returns the network ID
     * @param networkDescription The network description
     * @return A promise wrapping the network ID
     */
    function buildNetwork(networkDescription: string): Promise<string> {
        return axios
            .post(
                baseUrl,
                {
                    networkDescription: networkDescription,
                    kafkaSettings: {
                        bootstrapServers: [
                            {host: 'localhost', port: 9092}
                        ]
                    }
                }
            )
            .then(response => response.data.id);
    }

    /**
     * Attempts to delete the network from the server, and if succeed, returns the network ID
     * @param networkId The ID of the network to delete
     * @return A promise holding the ID of the deleted network
     */
    function deleteNetwork(networkId: string): Promise<string> {
        return axios.delete(`${baseUrl}/${networkId}`).then(() => networkId);
    }

    /**
     * Creates a web-socket subject that attempts to connect when the subject is subscribed.
     * @param networkId The ID of the spikes network
     * @return The open web-socket
     * @see WebSocketSubject
     */
    function webSocketSubjectFor(networkId: string): WebSocketSubject<string> {
        // create the rxjs subject that connects to the web-socket
        return webSocket({
            url: `${baseWebSocketUrl}/${networkId}`,
            deserializer: e => e.data
        });
    }

    /**
     * Creates a web-socket and returns it
     * @param networkId The Id of the network
     * @return A web-socket connection to the server with the network ID
     */
    function webSocketFor(networkId: string): WebSocket {
        return new WebSocket(`${baseWebSocketUrl}/${networkId}`);
    }

    return {
        buildNetwork,
        deleteNetwork,
        webSocketFor,
        webSocketSubjectFor,
    }
}