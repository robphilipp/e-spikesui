import fs from "fs";
import { setErrorMessages } from "../redux/actions/actions";

/**
 * Loads the sensor code-snippet template from its default location. The template is
 * used for creating a new environment code-snippet. If no environment code-snippet-template
 * file exists, then creates one using the `initialEnvironment` string.
 * @param path The path to the environment code-snippet template file
 * @return The a promise with the environment code-snippet template
 */
export function loadSensorsOrInitialize(path: string): Promise<string> {
    return readSensors(path)
        .catch(err => {
            // console.log(`Unable to read environment code-snippet template; path: ${path}; error: ${err.toString()}`);
            return saveSensors(path, initialSensors)
                .catch(err => `Unable load sensor code-snippet, and failed to write initial sensor code-snippet to file; path: ${path}; error: ${err.toString()}`)
                .then(() => initialSensors);
        })
}

/**
 * Attempts to read the environment code-snippet from the specified path.
 * @param path The path to the environment code-snippet.
 * @return A promise with the environment code-snippet
 */
export function readSensors(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const description = fs.readFileSync(path).toString();
            resolve(description);
        } catch (err) {
            reject(err.toString());
        }
    })
}

/**
 * Attempts save the specified environment code-snippet to the specified path.
 * @param path The path to the environment code-snippet.
 * @param codeSnippet The environment code-snippet to save
 * @return A promise that the environment code-snippet was saved
 */
export function saveSensors(path: string, codeSnippet: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (path === undefined || path === '') {
            reject(`Unable to save sensor because file path is undefined or empty`);
            return;
        }
        try {
            fs.writeFileSync(path, codeSnippet);
            resolve();
        } catch (err) {
            reject(err.toString());
        }
    })
}


const initialSensors = String.raw`// Add a code snippet to simulate signals sent to input neurons. The code snippet
// must return an object that holds an rx-js Observable of SensorOutput, and optionally, 
// an array holding the input neurons to which the signals are sent. The result 
// has the following shape:
// {
//    neuronIds?: Array<string>;
//    observable: Observable<SensorOutput>;
// }
//
// The SensorOutput has the following shape:
// {
//     sensorName: string;
//     neuronIds: Array<string>;
//     signal: {
//         units: "µV" | "mV",
//         value: number
//     };
// }
// See https://rxjs-dev.firebaseapp.com/guide/observable

function randomSignal(sensorName, neuronIds) {
   const index = Math.floor(Math.random() * neuronIds.length);
   return {
      sensorName: sensorName,
      neuronIds: [neuronIds[index]],
      signal: {value: 1.05 * Math.random(), units: 'mV'}
    //   signal: {value: 1.05, units: 'mV'}
   }
}

const sensorName = 'test-sensors';
const neuronIds = ['in-1', 'in-2', 'in-3', 'in-4'];

const observable =  interval(50).pipe(
   map(() => randomSignal(sensorName, neuronIds)),
)

return {neuronIds, observable};
`
