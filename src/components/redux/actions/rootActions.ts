import {NetworkManagementActionCreators, networkManagementActionCreators} from "./networkManagement";

interface RemoteActionCreators {
    networkManagement: NetworkManagementActionCreators;
}

/**
 * todo remove this
 * Generates the wrappers around the action creators that need to know the host and port of the server
 * @return
 */
export function generateRemoteActionCreators(): RemoteActionCreators {
    return {
        networkManagement: networkManagementActionCreators()
    }
}
// /**
//  * Generates the wrappers around the action creators that need to know the host and port of the server
//  * @param {ServerSettings} serverSettings The host, port, and base URL for making calls to the server
//  * @return
//  */
// export function generateRemoteActionCreators(serverSettings: ServerSettings): RemoteActionCreators {
//     return {
//         networkManagement: networkManagementActionCreators(serverSettings)
//     }
// }
