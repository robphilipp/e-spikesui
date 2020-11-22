import fs from "fs";

/**
 * Loads the environment code-snippet template from its default location. The template is
 * used for creating a new environment code-snippet. If no environment code-snippet-template
 * file exists, then creates one using the `initialEnvironment` string.
 * @param path The path to the environment code-snippet template file
 * @return The a promise with the environment code-snippet template
 */
export function loadSensorsOrInitialize(path: string): Promise<string> {
    return readSensors(path)
        .catch(err => {
            console.log(`Unable to read environment code-snippet template; path: ${path}; error: ${err.toString()}`);
            return saveSensors(path, initialSensors)
                .catch(err => {
                    // todo handle success and failure
                    console.log(`Unable to write environment code-snippet template to file; path: ${path}; error: ${err.toString()}`)
                })
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
            reject("File path cannot be undefined or empty");
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


const initialSensors = String.raw`// add a code snippet to simulate the environment that sends signals to the 
// spikes neural network. The code snippet must return an rx-js Observable which emits
// SensorOutput ({sensorName: string; neuronIds: Array<string>; signal: {units: "µV" | "mV", value: number};})
// See https://rxjs-dev.firebaseapp.com/guide/observable
function test(x) {
    return 3 * x;
 }
 
 const factor = 3
 
 return interval(100).pipe(
    filter(t => t % 3 === 0),
    map(t => ${'\u0060'}${'\u0024'}{factor} x ${'\u0024'}{t} = ${'\u0024'}{factor * t}${'\u0060'})
 )
`
