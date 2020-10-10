import {editor, IPosition, languages} from "monaco-editor/esm/vs/editor/editor.api";
import {
    extractKeyFrom,
    keyAfterCursorRe,
    keyBeforeCursorRe,
    keyFromValueRe,
    keyRe,
    stripText,
    valueRe
} from "./spikes-regex";
import {allCompletionVariablesFor, regexMap, Variable} from "./spikes-completions";

const sectionVariables = new Map<string, Variable>([
    ['GRP', {
        name: 'GRP',
        detail: 'group',
        description: 'The groups (GRP) section allows you to define functional groups of neurons. ' +
            'A group also defines the compute on which neurons belonging to that group execute. ' +
            'A group may execute locally, or on a remote compute node.',
        defaultValue: 'GRP'
    }],
    ['NRN', {
        name: 'NRN',
        detail: 'neurons',
        description: 'The neurons (NRN) section allows you to define neurons that belong to your ' +
            'neural network, an assign the neuron to a group defined in the GRP section.',
        defaultValue: 'NRN'
    }],
    ['CON', {
        name: 'CON',
        detail: 'connections',
        description: 'The connections (CON) section allows you to define connections between neurons. Each ' +
            'connection has an pre-synaptic, a post-synaptic neuron, a connection weight, an equilibrium ' +
            'connection weight, and a learning function that defines how the connection weights change in ' +
            'response to the environment and over time.',
        defaultValue: 'CON'
    }],
    ['LRN', {
        name: 'LRN',
        detail: 'learning',
        description: 'The learning section (LRN) allows you to define learning function parameters for ' +
            'the allowed learning functions ' +
            '\n 1. **stdp_soft** -- STDP with linear excitation/inhibition magnitudes' +
            '\n 2. **stdp_hard** -- STDP with Heaviside function for excitation/inhibition magnitudes' +
            '\n 3. **stdp_alpha** -- STDP with excitation/inhibition magnitudes described by an alpha function' +
            '\n 4. **flat** - learning is off and weights are not adjusted based on spike timing.' +
            '\n\nLearning is implemented as a form of spike-time-dependent plasticity (STDP). The idea is that if ' +
            'a pre-synaptic neuron frequently fires just before the post-synaptic neuron, then the pre-synaptic ' +
            'neuron is likely to be involved in causing the post-synaptic neuron to fire, and so there connection ' +
            'strength is increased. Conversely, if the pre-synaptic neuron frequently fires just after the ' +
            'post-synaptic neuron has fired, then the pre-synaptic neuron is likely not involved in causing the ' +
            'post-synaptic neuron to fire, and their connection is weakened.' +
            '\n\nSTDP *soft* and *hard* learning functions **f(t)** have two components. When pre-synaptic spikes are before the post-' +
            'synaptic neuron fires, then **f(t)=fe(t)=λe(w) Ae exp(-(tf -ts)/τe)**. When the pre-synaptic spikes arrive ' +
            'after the post-synaptic neuron has fired, then **f(t)=fi(t)=λi(w) Ai exp(-(ts - tf)/τi)**. **λe(w)** and ' +
            '**λi(w)** are the functions that limit the learning and are what determine whether it is a soft and hard. ' +
            '**Ae** (*exa*) is the excitation amplitude. **Ai** (*ina*) is the inhibition amplitude. **τe** (*exp*) is the ' +
            'excitation period, and **τi** (*inp*) is the inhibition period. **tf** is the time of the most recent post-synaptic ' +
            'neuron spike, and **ts** is the time of the pre-synaptic spike. For *STDP hard*, **λe(w)=Θ(w_max - w)** and **λi(w)=Θ(w - w_min)** where **Θ(x) = 1** when **x > 0** and ' +
            '**Θ(x) = 0** when **x ≤ 0**. For *STDP soft*, **λe(w)=max(0, w_max - w)** and **λi(w)=min(0, w - w_min)**' +
            '\n\nFor *STDP alpha*, the learning function that is shaped like an **α**-function (**f(t) = (-t/τ) exp(t/τ)**) ' +
            'on a baseline **b** (*bln*), **f(t) = max(b, (-t/τ) exp(t/τ) + b))**. When the pre-synaptic spike arrives at the ' +
            'post-synaptic neuron before the post-synaptic neuron fires, then the weight change is greater than or ' +
            'equal to the baseline times the learning rate (depending on the timing). And when the pre-synaptic spike ' +
            'arrives at the post-synaptic neuron after the post-synaptic neuron has fired, then the weight change is ' +
            'the baseline times the learning rate value. **ω(t+1) = ω(t) + ∆ω**' +
            'where **ω(t)** is the current connection weight, **ω(t+1)** is the updated connection weight, ' +
            '**∆ω** is the calculated weight change, and **η** is the learning rate (*alr*) that is included in the weight ' +
            'change calculation, and **τ** is the time constant (*atc*) that tempers the time dependence. \n',
        defaultValue: 'LRN'
    }]
]);

const neuronFunctionVariables = new Map<string, Variable>([
    ['WDF', {
        name: 'WDF',
        detail: 'weight-decay function',
        description: 'The weight decay function describes the decay of synaptic efficacy over ' +
            'time, since the last spike. There are two weight decay functions currently available, ' +
            '**exp** and **zer**. The **zer** weight-decay function simply returns a value of **1** ' +
            'leaving the connection weight unchanged. The exponential decay function has the form ' +
            '**w(t)=exp(−(t−f)/τ)** where **τ** is the decay half-life, and **f** is the time of ' +
            'the last spike.',
        defaultValue: 'WDF'
    }],
    ['SRP', {
        name: 'SRP',
        detail: 'synaptic release probability',
        description: 'The synapse release probability describes the effects of a synapse\'s facilitation ' +
            'and depletion. Facilitation occurs when an action potential reaches the synapse (pre-synaptic ' +
            'side). This may enhance the concentration of calcium ions and facilitate the release of neurotransmitters ' +
            'into the synaptic cleft. Depletion, on the other hand, occurs when the neuron releases ' +
            'neurotransmitters into the cleft, thereby depleting the concentration of vesicles available ' +
            'for release.\n\n' +
            'The release-probability, given an action potential at **ti** is modelled as\n\n' +
            '> **p(ti) = 1 - exp(-C(ti) V(ti))**\n\n' +
            'where **C(t)** is the facilitation and **V(t)** is the depletion. The facilitation at some time ' +
            '**t** on or after that last action potential is given by\n\n' +
            '> **C(t) = C0 + α sum(ti ≤ t; exp(-(t- ti) / τc))**\n\n' +
            'where **C0** is the base, **α** is the magnitude, and **τc** is the time-constant. The sum runs ' +
            'over all the action-potential times **ti** for which **ti ≤ t**.\n' +
            'The depletion is given by\n\n' +
            '> **V(t) = max(0, V0 - β sum(ti ≤ t; exp(-(t - ti) / τv)))**\n\n' +
            'where **V0** is the base, **β** is the magnitude, and **τv** is the time-constant. The sum runs over ' +
            'all the action-potential times **ti** for which **ti ≤ t**, and for which the action potential caused ' +
            'a release.',
        defaultValue: 'SRP'
    }],
    ['WLF', {
        name: 'WLF',
        detail: 'weight limiter function',
        description: 'The weight-limiter function provide bounds on a neuron\'s incoming connection ' +
            'weights (i.e. the weights connecting the neuron to its pre-synaptic neurons). This function ' +
            'is also used to calculate the minimum and maximum weights used when using a hard or soft ' +
            'limit STDP function.',
        defaultValue: 'WLF'
    }],
    ['LOC', {
        name: 'LOC',
        detail: 'location',
        description: 'The location function assigns a physical, 3-dimensional, location to the neuron. The' +
            'distance between neurons and a finite action potential conductance speed determines the signal ' +
            'delay between the pre- and post-synaptic neuron. The neurons topology is is a crucial component ' +
            'of the networks behavior.',
        defaultValue: 'LOC'
    }],
]);

// map that holds the regular expressions used to determine whether the cursor is in
// an item (used by the selectionsForField(...) function)
const REGEX_MAP = regexMap(lastKeyHasValueOf);

/**
 * Determines whether the value of the last key has the specified value.
 * @param {string} key The key
 * @param {string} value The values that the last value of the key is being tested for
 * @param {string} text The stripped text
 * @param {string} line The current line
 * @return {boolean} `true` if the value of the last key has the specified value; `false` otherwise
 */
function lastKeyHasValueOf(key: string, value: string, text: string, line: string): boolean {
    const strippedLine = stripText(line);

    // find the position of the "key=" string in the stripped text, and the position of
    // the "key=value" string in the stripped line
    const lastKeyPos = text.lastIndexOf(`${key}=`);
    const lineKeyValuePos = strippedLine.lastIndexOf(`${key}=${value}`);

    // when the "key=" string is found in the text, and the "key=value" string is in
    // the line, cursor is on a completed key-value pair, and it comes after the "key="
    // string. for example, a hover over the value of a key-value pair
    // if (lastKeyPos >= 0 && lineKeyValuePos >= 0) {
    if (lastKeyPos >= 0 && lineKeyValuePos >= 0) {
        return text.lastIndexOf(`${key}=${value}`) >= lastKeyPos-1 || lineKeyValuePos > -1;
    }

    // the cursor is before the "key=" in the stripped text, so we check to see if
    // the stripped line has the "key=value" pair. for example, this could occur when
    // the hover is over the key of the key=value pair.
    return strippedLine.lastIndexOf(`${key}=${value}`) > -1;
}

/**
 * The cursor is over a key (i.e. GRP, nid, NRN, hst, etc) and so the text-until-cursor will not necessarily
 * have the full key. This function extracts the full kei from the current line and then returns the hover
 * information.
 * @param {editor.ITextModel} model
 * @param {IPosition} position
 * @return {languages.ProviderResult<languages.Hover>}
 */
function keyHover(model: editor.ITextModel, position: IPosition): languages.ProviderResult<languages.Hover> {
    const currentLine = model.getLineContent(position.lineNumber);
    const before = stripText(currentLine.substring(0, position.column)).match(keyBeforeCursorRe);
    const after = stripText(currentLine.substring(position.column)).match(keyAfterCursorRe);
    const key = `${before ? before[0] : ''}${after ? after[0] : ''}`

    return hover(key, model, position);
}

/**
 * When the cursor is hovering over a value, then pull out the key to which the value belongs and call
 * the hover function.
 * @param {editor.ITextModel} model
 * @param {IPosition} position
 * @return {languages.ProviderResult<languages.Hover>}
 */
function valueHover(model: editor.ITextModel, position: IPosition): languages.ProviderResult<languages.Hover> {
    const currentLine = model.getLineContent(position.lineNumber);
    const key = extractKeyFrom(stripText(currentLine.substring(0, position.column)).match(keyFromValueRe));
    return hover(key, model, position);
}

/**
 * Returns a map holding the variables that match the field name for the sections (GRP, NRN,
 * CON, LRN) and the neuron functions (WDF, SRP, WLF, LOC).
 * @param {string} fieldName The field name (i.e. GRP, NRN, CON, LRN, WDF, SRP, WLF, LOC)
 * @return {Map<string, Variable>} The map holding the variable group names and the matching
 * variable for that group.
 */
function allHoverVariablesFor(fieldName: string): Map<string, Variable> {
    return new Map<string, Variable>((
        [
            ['sections', sectionVariables.get(fieldName)],
            ['neuronFunc', neuronFunctionVariables.get(fieldName)],
        ] as Array<[string, Variable | undefined]>)
        .filter((entry: [string, Variable | undefined]) => entry[1] !== undefined) as Array<[string, Variable]>);
}

/**
 * Figures out to what the key belongs, and returns the corresponding hover information
 * @param {string} key
 * @param {editor.ITextModel} model
 * @param {IPosition} position
 * @return {languages.ProviderResult<languages.Hover>}
 */
function hover(key: string, model: editor.ITextModel, position: IPosition): languages.ProviderResult<languages.Hover> {
    // grab all the variables for completion
    const variables = allCompletionVariablesFor(key);
    // add in the sections and neuron functions that are not part of the completion variables
    allHoverVariablesFor(key).forEach((variable, key) => variables.set(key, variable));

    // when the field name is unique, then all that is left to do is to calculate the list of completions for
    // the field and return that list
    if (variables.size === 1) {
        return hoverContent(key, variables.values().next().value);
    }

    // when there is a conflict, then need to use the stripped text to figure out where in the text the user is.
    // so for each place where the field name matches, check if the regex matches
    const textUntil = strippedTextToCursor(model, position);
    const currentLine = model.getLineContent(position.lineNumber);
    for (const [field, value] of Array.from(variables.entries())) {
        const testFunc = REGEX_MAP.get(field);
        if (testFunc && testFunc(textUntil, currentLine)) {
            return hoverContent(key, value);
        }
    }

    return {contents: []};
}

/**
 * Creates the contents to display in the hover pop-up
 * @param {string} key The key (of the key-value pair) over which the cursor is hovering.
 * @param {Variable} value The variable holding information about the key
 * @return {languages.ProviderResult<languages.Hover>} The the contents to display in the hover pop-up
 */
function hoverContent(key: string, value: Variable): languages.ProviderResult<languages.Hover> {
    const units = value.units ? `(${value.units})` : '(dimensionless)'
    return {
        contents: [
            {value: `**${key}** ${units}`},
            {value: value.description}
        ]
    };
}

/**
 * Simple helper function that returns the text from the beginning of the what's in the
 * editor to the current cursor, and strips it of comments, newlines, and spaces.
 * @param {editor.ITextModel} model The editor model
 * @param {IPosition} position The cursor position
 * @return {string} The text from the beginning of the what's in the editor to the current
 * cursor, stripped of comments, newlines, and spaces.
 */
function strippedTextToCursor(model: editor.ITextModel, position: IPosition): string {
    const textUntil = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    });
    return stripText(textUntil);
}

export const spikesHovers: languages.HoverProvider = {
    provideHover: function (model: editor.ITextModel, position: IPosition): languages.ProviderResult<languages.Hover> {
        // determine the key for the nearest key value pair. the key is either (1) the text at the cursor,
        // or (2) the text to the left of the equal sign to the left of the cursor.

        // grab all the text up to the cursor and strip it
        const strippedText = strippedTextToCursor(model, position);

        // determine whether the hover is a key or a value
        if (strippedText.match(keyRe)) {
            return keyHover(model, position);
        }
        else if (strippedText.match(valueRe)) {
            return valueHover(model, position);
        }

        return {
            contents: []
        };
    }
}
