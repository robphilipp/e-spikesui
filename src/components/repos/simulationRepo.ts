import fs from "fs";

export interface SimulationProject {
    simulationName: string;
    timeFactor: number;
    networkFilePath: string;
    sensorFilePath: string;
}

/**
 * Reads (async) the simulation project from file and returns a simulation project structure
 * @param path The path to the simulation project file
 * @return The SimulationProject holding the name, time-factor, network description, and
 * sensor description
 */
export function readSimulationProject(path: string): Promise<SimulationProject> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (error, data) => {
            if (error) {
                reject(error);
            } else {
                try {
                    resolve(JSON.parse(data.toString()));
                }
                catch(syntaxErr) {
                    reject(syntaxErr);
                }
            }
        })
    })
}

/**
 * Writes (async) the simulation project to file and returns a promise.
 * @param path The path to the file to which to write the simulation project
 * @param project The simulation project
 * @return An empty promise
 */
export function writeSimulationProject(path: string, project: SimulationProject): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(project), (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        })
    })
}