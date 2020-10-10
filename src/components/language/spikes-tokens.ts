import {languages} from "monaco-editor/esm/vs/editor/editor.api";

// todo bug: last item of a section can have an extra comma in it. for example last group in GRP could be (gid=a1,)
//      and that wouldn't flag an error.
/**
 * Describes the spikes neural network description language.
 *
 * See the [monarch language documentation](https://microsoft.github.io/monaco-editor/monarch.html) for a detailed
 * description of how to construct a language.
 *
 * The spikes language is quite simple. A network is described within a set of brackets, for example, `(...)`. A network
 * has four sections
 * 1. group definitions (`GRP=[...]`)
 * 2. neuron definitions (`NRN=[...]`)
 * 3. connection definitions (`CON=[...]`)
 * 4. learning-function definitions (`LRN=[...]`)
 *
 * Each section starts with a 3-letter code and is enclosed by square brackets, for example, `NRN=[...]`. The square
 * brackets denote that each section is a list of elements. For example, the `GRP` section is a list of groups that
 * define where each neuron executes. The `NRN` section is a list of neurons in the network. The `CON` section is a
 * list of connections between neurons. And, finally, the `LRN` section is a list of the learning functions used in
 * the network.
 *
 * In each section, an element (be it a group, neuron, connection, learning function) is defined with a set of
 * brackets (i.e. `(...)`). The details elements depend on what they are (i.e. group, neuron, etc). Each element
 * though, it composed of a set of key-value pairs, where the value can be a simple value (i.e. string, number) or
 * a function name that contains a new element with its own key-value pairs. All key-value pairs have the form
 * `key=value`.
 *
 * The spikes language is described for the editor using the Monarch language. The tokenizer uses regex to describe
 * the tokens that are matched, and the matches depend on the state of the lexer. For example, in the root state,
 * there are the 4 sections (i.e. GRP, NRN, CON, LRN). When one of these is matched, the state switches. For example,
 * when the `GRP` is matched, then the state switches to the `groups` state, and now those tokens define what is
 * matched in the groups state.
 */
export const spikesTokens: languages.IMonarchLanguage = {
    defaultToken: 'invalid',
    brackets: [
        {open: '[', close: ']', token: 'delimiter.square'},
        {open: '(', close: ')', token: 'delimiter.parenthesis'},
        {open: '{', close: '}', token: 'delimiter.curly'},
    ],
    tokenizer: {
        root: [
            {include: '@comments'},
            [/\s*\(\s*/, 'delimiter.parenthesis', '@sections'],
            [/\s*\)\s*/, 'delimiter.parenthesis'],
        ],
        comments: [
            [/\/\/.*$/, "comment"],
        ],
        brackets: [
            [/([[\]()])/, 'bracket']
        ],
        units: [
            [/(µs|ms|s|nV|µV|mV|µm|mm|µWb|mWb|m\/s)(?=\s*[,)])/, "unit"],
        ],
        lists: [
            [/({(\d+)([,-])(\d+)})/, "list"],
        ],
        operators: [
            [/=/, 'operator'],
        ],
        functions: [
            [/(fnc|lrn)(?==)/, "function"],
        ],
        propValues: [
            [/(?!=)(\s*-?\s*\d+(.\d+)*)(?=([, )]|(µs|ms|s|nV|µV|mV|µm|mm|µWb|mWb|m\/s)))/, 'number-attribute'],
            [/(?!=)([\w.-]+)(?=[, )])/, 'string-attribute'],
            [/(?!=)([\w.-]+)({(\d+)([,-])(\d+)})?(?=[, )])/, 'list-attribute'],
        ],
        sections: [
            [/]\s*,/, 'delimiter.square'],
            [/]\s*/, 'delimiter.square', '@root'],
            {include: '@comments'},
            [/\s*GRP(?=\s*=(\s*\[))/, "section.group", '@groups'],
            [/\s*NRN(?=\s*=(\s*\[))/, "section.neuron", '@neurons'],
            [/\s*CON(?=\s*=(\s*\[))/, "section.connection", '@connections'],
            [/\s*LRN(?=\s*=(\s*\[))/, "section.learn", '@learning'],
        ],

        //
        // groups
        // [regex, token-name, next] is shorthand for {regex: /ddd/, action: {token: 'ddd', next: '@ddd'}}
        // order matters
        //
        // a list of group where each group is (key=value, ...) and groups are separated by commas
        groups: [
            [/\s*=\s*/, 'operator'],
            [/\s*\[\s*/, 'delimiter.square'],
            [/(?=\s*\(\s*)/, 'delimiter.parenthesis', '@group'],
            {include: '@comments'},
            [/(?=]\s*,?)/, 'delimiter.square', '@sections'],
        ],
        group: [
            [/\s*\(\s*/, 'delimiter.parentheses', '@groupProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        groupProperty: [
            {include: '@comments'},
            [/(gid|hst|prt)(?=\s*=\s*)/, 'property', '@groupValue'],
            {include: '@operators'},
            {include: '@propValues'},
            [/\)/, 'delimiter.parentheses', '@groups'],
            [/\)\s*]/, 'delimiter.parentheses', '@sections'],
        ],
        groupValue: [
            [/\s*=\s*/, 'operator'],
            {include: '@operators'},
            {include: '@propValues'},
            [/\s*\)\s*,\s*/, 'groups.group', '@group'],
            [/\s*\)\s*/, 'delimiter.parentheses', '@sections'],
            {include: '@comments'},
            [/(?=\s*]\s*)/, 'delimiter.square', '@groups'],
            [/\s*,\s*/, 'comma', '@groupProperty'],
        ],

        //
        // neurons
        //
        neurons: [
            [/\s*=\s*/, 'operator'],
            [/\s*\[\s*/, 'delimiter.square'],
            [/(?=\s*\(\s*)/, 'delimiter.parenthesis', '@neuron'],
            {include: '@comments'},
            [/(?=]\s*,?)/, 'delimiter.square', '@sections'],
        ],
        neuron: [
            [/\s*\(\s*/, 'delimiter.parentheses', '@neuronProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        neuronProperty: [
            {include: '@comments'},
            [/(nid|grp|nty|mst|inh|rfp|rfb|mnp|mpd|mpr|mpn|wnm|spp|csp|ipb|ipl|ipd)(?=\s*=\s*)/, 'property', '@neuronValue'],
            [/\s*WDF(?=\s*=(?=\s*\())/, 'property.neuron.function', '@weightDecay'],
            [/\s*SRP(?=\s*=(?=\s*\())/, 'property.neuron.function', '@synapticReleaseProb'],
            [/\s*WLF(?=\s*=(?=\s*\())/, 'property.neuron.function', '@weightLimit'],
            [/\s*LOC(?=\s*=(?=\s*\())/, 'property.neuron.function', '@coordinates'],
            {include: '@operators'},
            {include: '@propValues'},
            [/\)/, 'delimiter.parentheses', '@neurons'],
            [/\)\s*]/, 'delimiter.parentheses', '@sections'],
        ],
        neuronValue: [
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            [/\s*=\s*/, 'operator'],
            [/\s*\)\s*,\s*/, 'neurons.neuron', '@neuron'],
            [/\s*\)\s*/, 'delimiter.parentheses', '@sections'],
            {include: '@comments'},
            [/\s*,\s*/, 'comma', '@neuronProperty'],
        ],

        weightDecay: [
            [/\s*\(\s*/, 'delimiter.parenthesis', '@weightDecayProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        weightDecayProperty: [
            {include: '@comments'},
            [/(fnc)(?=\s*=\s*)/, 'function', '@weightDecayValue'],
            [/(dhl)(?=\s*=\s*)/, 'property', '@weightDecayValue'],
            {include: '@operators'},
            {include: '@propValues'},
        ],
        weightDecayValue: [
            [/(?!\s*=\s*)(zer|exp)/, 'function-name'],
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            [/\s*=\s*/, 'operator'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@neuronValue'],
            {include: '@comments'},
            [/\s*,\s*/, 'comma', '@weightDecayProperty'],
        ],

        synapticReleaseProb: [
            [/\s*\(\s*/, 'delimiter.parentheses', '@synapticReleaseProbProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        synapticReleaseProbProperty: [
            {include: '@comments'},
            [/(fcb|fcm|fct|dpb|dpm|dpt)(?=\s*=\s*)/, 'property', '@synapticReleaseProbValue'],
            {include: '@operators'},
            {include: '@propValues'},
        ],
        synapticReleaseProbValue: [
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            [/\s*=\s*/, 'operator'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@neuronValue'],
            {include: '@comments'},
            [/\s*,\s*/, 'comma', '@synapticReleaseProbProperty'],
        ],

        weightLimit: [
            [/\s*\(\s*/, 'delimiter.parenthesis', '@weightLimitProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        weightLimitProperty: [
            {include: '@comments'},
            [/(fnc)(?=\s*=\s*)/, 'function', '@weightLimitValue'],
            [/(lwb|upb)(?=\s*=\s*)/, 'property', '@weightLimitValue'],
            {include: '@operators'},
            {include: '@propValues'},
        ],
        weightLimitValue: [
            [/(?!\s*=\s*)(bnd|unb)/, 'function-name'],
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            [/\s*=\s*/, 'operator'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@neuronValue'],
            {include: '@comments'},
            [/\s*,\s*/, 'comma', '@weightLimitProperty'],
        ],

        coordinates: [
            [/\s*\(\s*/, 'delimiter.parenthesis', '@coordinateProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        coordinateProperty: [
            {include: '@comments'},
            [/(cst|px1|px2|px3)(?=\s*=\s*)/, 'property', '@coordinateValue'],
            {include: '@operators'},
            {include: '@propValues'},
        ],
        coordinateValue: [
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            [/\s*=\s*/, 'operator'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@neuronValue'],
            {include: '@comments'},
            [/\s*,\s*/, 'comma', '@coordinateProperty'],
        ],

        //
        // connections
        //
        connections: [
            [/\s*=\s*/, 'operator'],
            [/\s*\[\s*/, 'delimiter.square'],
            [/(?=\s*\(\s*)/, 'delimiter.parenthesis', '@connection'],
            {include: '@comments'},
            [/(?=]\s*,?)/, 'delimiter.square', '@sections'],
        ],
        connection: [
            [/\s*\(\s*/, 'delimiter.parentheses', '@connectionProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        connectionProperty: [
            {include: '@comments'},
            [/(prn|psn|cnw|eqw|lrn)(?=\s*=\s*)/, "property", '@connectionValue'],
            {include: '@operators'},
            {include: '@propValues'},
            [/\)/, 'delimiter.parenthesis', '@connections'],
            [/\)\s*]/, 'delimiter.parenthesis', '@sections'],
        ],
        connectionValue: [
            [/\s*=\s*/, 'operator'],
            [/(stdp_soft|stdp_hard|stdp_alpha|flat)/, 'function-name'],
            {include: '@operators'},
            {include: '@propValues'},
            {include: '@units'},
            {include: '@functions'},
            [/\s*\)\s*,\s*/, 'connections.connection', '@connection'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@sections'],
            {include: '@comments'},
            [/(?=\s*]\s*)/, 'delimiter.square', '@connections'],
            [/\s*,\s*/, 'comma', '@connectionProperty'],
        ],

        //
        // learning functions
        //
        learning: [
            [/\s*=\s*/, 'operator'],
            [/\s*\[\s*/, 'delimiter.square'],
            [/(?=\s*\(\s*)/, 'delimiter.parenthesis', '@learn'],
            {include: '@comments'},
            [/(?=]\s*,?)/, 'delimiter.square', '@sections'],
        ],
        learn: [
            [/\s*\(\s*/, 'delimiter.parentheses', '@learnProperty'],
            {include: '@comments'},
            {include: '@operators'},
            {include: '@propValues'},
        ],
        learnProperty: [
            {include: '@comments'},
            [/(fnc|ina|inp|exa|exp|bln|alr|atc)(?=\s*=\s*)/, "property", '@learnValue'],
            {include: '@operators'},
            {include: '@propValues'},
            [/\)/, 'delimiter.parenthesis', '@learning'],
            [/\)\s*]/, 'delimiter.parenthesis', '@sections'],
        ],
        learnValue: [
            [/\s*=\s*/, 'operator'],
            [/(stdp_soft|stdp_hard|stdp_alpha|flat)/, 'function-name'],
            {include: '@operators'},
            {include: '@units'},
            {include: '@propValues'},
            {include: '@functions'},
            [/\s*\)\s*,\s*/, 'connections.connection', '@learn'],
            [/\s*\)\s*/, 'delimiter.parenthesis', '@sections'],
            {include: '@comments'},
            [/(?=\s*]\s*)/, 'delimiter.square', '@learning'],
            [/\s*,\s*/, 'comma', '@learnProperty'],
        ],
    }
}
