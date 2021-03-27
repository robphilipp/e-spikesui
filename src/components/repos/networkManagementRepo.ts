import ServerSettings from "../settings/serverSettings";
import axios from "axios";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {webSocket} from "rxjs/webSocket";

export interface NetworkManagementRepo {
    buildNetwork: (networkDescription: string) => Promise<string>;
    deleteNetwork: (networkId: string) => Promise<string>;
    rawWebSocketFor: (networkId: string) => WebSocket;
    webSocketFor: (networkId: string) => Promise<WebSocket>;
    webSocketSubjectFor: (networkId: string) => WebSocketSubject<string>;
}

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

    function rawWebSocketFor(networkId: string): WebSocket {
        return new WebSocket(`${baseWebSocketUrl}/${networkId}`);
    }

    function webSocketFor(networkId: string): Promise<WebSocket> {
        return new Promise<WebSocket>((resolve, reject) => {
            try {
                const webSocket = new WebSocket(`${baseWebSocketUrl}/${networkId}`);
                webSocket.onopen = () => resolve(webSocket);
                webSocket.onerror = (error) => {
                    console.log(error);
                    reject(error);
                }
            } catch(error) {
                reject(error);
            }
        });
    }

    return {
        buildNetwork,
        deleteNetwork,
        rawWebSocketFor,
        webSocketFor,
        webSocketSubjectFor,
    }
}