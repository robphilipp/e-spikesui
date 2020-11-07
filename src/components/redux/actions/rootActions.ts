import ServerSettings from "../../settings/serverSettings";
// import {networkManagementActionCreators} from "./networkManagement";

/**
 * Generates the wrappers around the action creators that need to know the host and port of the server
 * @param {ServerSettings} serverSettings The host, port, and base URL for making calls to the server
 * @return
 */
export function generateRemoteActionCreators(serverSettings: ServerSettings) {
    return {
        // ...networkManagementActionCreators(serverSettings)
    }
}