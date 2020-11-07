/**
 * Code for handling completions in the editor
 */

// import {CancellationToken, editor, IPosition, IRange, languages} from "monaco-editor";
import {editor, languages, CancellationToken, IPosition, IRange} from "monaco-editor/esm/vs/editor/editor.api";
// import {CancellationToken, IPosition, IRange} from "monaco-editor";
import {
    inConRe, inConsSecRe,
    inGrpRe,
    inGrpsSecRe,
    inLocRe,
    inLrnRe, inLrnsSecRe, inNeuronSection,
    inNrnRe,
    inSrpRe,
    inWdfRe,
    inWlfRe,
    newConRe,
    newGrpRe,
    newLocRe,
    newLrnRe,
    newNrnRe,
    newSrpRe,
    newWdfRe,
    newWlfRe,
    stripText
} from "./spikes-regex";

// todo bug: completions filter based on the typing. oddly for the even items in group, neuron, connection, or learning
//      function, the filtering works. But for odd items, it doesn't show the list anymore

/**
 * Defines the variable information for completions
 */
export interface Variable {
    name: string;
    detail: string;
    description: string;
    defaultValue: string | number;
    units?: 'µs' | 'ms' | 's' | 'nV' | 'µV' | 'mV' | 'µm' | 'mm' | 'µWb' | 'mWb' | 'm/s';
    validValues?: Array<string>;
}

//
// information for completions
//

const groupVariables = new Map<string, Variable>([
    ['gid', {
        name: 'gid',
        detail: 'group_id',
        description: 'The execution group ID. Neurons are assigned to an execution group. ' +
            'Execution groups may execute locally or remotely (i.e. on different compute nodes).',
        defaultValue: 'grp-1'
    }],
    ['hst', {
        name: 'hst',
        detail: 'hostname',
        description: 'The hostname or IP address of the compute node for remote execution groups.',
        defaultValue: 'localhost'
    }],
    ['prt', {
        name: 'prt',
        detail: 'port',
        description: 'The port on the compute node for remote execution groups.',
        defaultValue: 8888
    }],
]);

const neuronBaseVarsOrder = ['nid', 'grp', 'nty', 'mst', 'inh', 'rfp', 'rfb', 'mnp', 'mpd', 'mpr',
    'mpn', 'wnm', 'spp', 'csp', 'ipd', 'ipl', 'ipd'];
const neuronBaseVariables = new Map<string, Variable>([
    ['nid', {name: 'nid', detail: 'neuron_id', description: 'The ID of the neuron.'} as Variable],
    ['grp', {
        name: 'grp',
        detail: 'group_id',
        description: 'The ID of the group to which this neuron belongs.'
    } as Variable],
    ['nty', {
        name: 'nty',
        detail: 'neuron_type',
        description: 'The type of neuron. There are four neuron types: \n 1. monostable integrator (mi); ' +
            '\n 2. bistable integrator (bi); \n 3. monostable resonators (mr); and, \n 4. bistable resonators (br). ' +
            '\n\nRoughly speaking, integrators spike once when the threshold is exceeded, and resonators ' +
            'issue tonic spikes while the membrane potential is in a given band.',
        defaultValue: 'mi',
        validValues: ['mi', 'bi', 'mr', 'br']
    }],
    ['mst', {
        name: 'mst',
        detail: 'membrane_spike_threshold',
        description: 'The membrane potential at which the neuron spikes.',
        defaultValue: '1',
        units: 'mV'
    }],
    ['inh', {
        name: 'inh',
        detail: 'is_inhibitor',
        description: 'Set to **t** for an inhibitor neuron. Set to **f** for an excitation neuron. ' +
            'There are inhibitor neurons which send inhibition signals to other neurons. And there are excitation ' +
            'neurons that send excitation signal to other neurons.',
        defaultValue: 'f',
        validValues: ['f', 't']
    }],
    ['rfp', {
        name: 'rfp',
        detail: 'refractory_period',
        description: 'The neuron\'s refractory period τ_r. This is the absolute refractory period ' +
            'and is used in the calculation of the relative refractoriness.',
        defaultValue: 2,
        units: 'ms'
    }],
    ['rfb', {
        name: 'rfb',
        detail: 'base_refractoriness',
        description: 'During the relative refractory period, an amount is subtracted from the ' +
            'membrane potential. The amount subtracted starts at the base-refractoriness level and ' +
            'decays to zero exponentially, with a time-constant given by the refractory period.',
        defaultValue: 0.1,
        units: 'µWb'
    }],
    ['mnp', {
        name: 'mnp',
        detail: 'min_membrane_potential',
        description: 'The minimum and resting membrane potential. This is the value that the neuron\'s membrane ' +
            'potential returns to after it fires, or in when it is in a resting state.',
        defaultValue: 0,
        units: 'mV'
    }],
    ['mpd', {
        name: 'mpd',
        detail: 'membrane_potential_decay',
        description: 'The decay half-life of the membrane potential\'s exponential decay. This decay ' +
            'forms part of the synapse response kernel for incoming spikes.',
        defaultValue: 2500,
        units: 'ms'
    }],
    ['mpr', {
        name: 'mpr',
        detail: 'membrane_potential_rise',
        description: 'The rise half-life of the membrane potential\'s exponential rise. This rise ' +
            'forms part of the synapse response kernel for incoming spikes.',
        defaultValue: 2,
        units: 'ms'
    }],
    ['mpn', {
        name: 'mpn',
        detail: 'membrane_potential_noise',
        description: 'The noise added/subtracted to the membrane potential at an update. The ' +
            'noise is modelled as Wiener process.',
        defaultValue: 0.0,
        units: 'mV'
    }],
    ['wnm', {
        name: 'wnm',
        detail: 'weight_noise_magnitude',
        description: 'The noise added/subtracted to the neuron\'s connection weights at an update. ' +
            'The noise is modelled as Wiener process.',
        defaultValue: 0
    }],
    ['spp', {
        name: 'spp',
        detail: 'spike_potential',
        description: 'Determines the magnitude of an outgoing spike.',
        defaultValue: 1,
        units: 'mV'
    }],
    ['csp', {
        name: 'csp',
        detail: 'conductance_speed',
        description: 'The speed at which the action potential propagates down the axon to the synapse. ' +
            'The approximation is that the soma sits at the neuron\'s coordinate (x, y, z) and that the ' +
            'signal from the pre-synaptic neuron to the post-synaptic neuron is calculated by **∆t = s * d** ' +
            'where **s** is the conductance speed and **d** is the distance between the neurons.',
        defaultValue: 1.1,
        units: 'm/s'
    }],
    ['ipb', {
        name: 'ipb',
        detail: 'intrinsic_plasticity_base',
        description: 'The base value (**b0**) of the intrinsic plasticity (**b**) update. ' +
            'The intrinsic plasticity is updated using **b(t+1) = b(t) + ∆b η**, where ' +
            '**∆b = exp(-(b(t+1) + b0))**.',
        defaultValue: 0,
        units: 'mV'
    }],
    ['ipl', {
        name: 'ipl',
        detail: 'intrinsic_plasticity_learning',
        description: 'This is the factor **η** multiplying the change in the intrinsic plasticity ' +
            '**∆b** when updating the intrinsic plasticity according to **b(t+1) = b(t) + ∆b η**.',
        defaultValue: 0,
        units: 'mV'
    }],
    ['ipd', {
        name: 'ipd',
        detail: 'intrinsic_plasticity_decay',
        description: 'Between neuron firing, the intrinsic plasticity **b(t)** decays exponentially with ' +
            'a half-life τ according to **b(t′)=b(t)exp(−(t′−t)/τ)**.',
        defaultValue: 3600,
        units: 's'
    }],
]);

//
// weight decay function
const zeroWeightDecayOrder = ['fnc'];
const weightDecayOrder = ['fnc', 'dhl'];
const zeroWeightDecayVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'weight_decay_function',
        description: 'The weight decay function describes the decay of synaptic efficacy over ' +
            'time, since the last spike. There are two weight decay functions currently available, ' +
            '**exp** and **zer**. The **zer** weight-decay function simply returns a value of **1** ' +
            'leaving the connection weight unchanged. The exponential decay function has the form ' +
            '**w(t)=exp(−(t−f)/τ)** where **τ** is the decay half-life, and **f** is the time of ' +
            'the last spike.',
        defaultValue: 'zer',
        validValues: ['zer', 'exp']
    }],
]);
const weightDecayVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'weight_decay_function',
        description: 'The weight decay function describes the decay of synaptic efficacy over ' +
            'time, since the last spike. There are two weight decay functions currently available, ' +
            '**exp** and **zer**. The **zer** weight-decay function simply returns a value of **1** ' +
            'leaving the connection weight unchanged. The exponential decay function has the form ' +
            '**w(t)=exp(−(t−f)/τ)** where **τ** is the decay half-life, and **f** is the time of ' +
            'the last spike.',
        defaultValue: 'exp',
        validValues: ['zer', 'exp']
    }],
    ['dhl', {
        name: 'dhl',
        detail: 'decay_half_life',
        description: 'The weight decay half-life **τ** for the exponential decay function. ' +
            'The exponential decay function has the form **w(t)=exp(−(t−f)/τ)** where ' +
            '**τ** is the decay half-life, and **f** is the time of the last spike.',
        defaultValue: 100,
        units: 's'
    }],
]);
const zeroWeightDecayTemplate = createDefaultsTemplatePart('', zeroWeightDecayOrder, zeroWeightDecayVariables, '', 0);
const weightDecayTemplate = createTemplatePart('', weightDecayOrder, weightDecayVariables, '', 0);
const weightDecayDefaultsTemplate = createDefaultsTemplatePart('', weightDecayOrder, weightDecayVariables, '', 0);

//
// synapse release probability
const srpOrder = ['fcb', 'fcm', 'fct', 'dpb', 'dpm', 'dpt'];
const synapseReleaseProbVariables = new Map<string, Variable>([
    ['fcb', {
        name: 'fcb',
        detail: 'facilitation_base',
        description: 'The facilitation base **C0** for the synaptic release probability. ' +
            'The facilitation at some time **t** on or after that last action potential is given by\n\n' +
            '> **C(t) = C0 + α sum(ti ≤ t; exp(-(t- ti) / τc))**\n\n' +
            'where **C0** is the base, **α** is the magnitude, and **τc** is the time-constant. The sum runs ' +
            'over all the action-potential times **ti** for which **ti ≤ t**.\n',
        defaultValue: 1000
    }],
    ['fcm', {
        name: 'fcm',
        detail: 'facilitation_magnitude',
        description: 'the facilitation magnitude **α** for the signal release probability. ' +
            'The facilitation at some time **t** on or after that last action potential is given by\n\n' +
            '> **C(t) = C0 + α sum(ti ≤ t; exp(-(t- ti) / τc))**\n\n' +
            'where **C0** is the base, **α** is the magnitude, and **τc** is the time-constant. The sum runs ' +
            'over all the action-potential times **ti** for which **ti ≤ t**.\n',
        defaultValue: 0.1
    }],
    ['fct', {
        name: 'fct', detail: 'facilitation_time_constant',
        description: 'The facilitation time-constant **τc** for the signal release probability. ' +
            'The facilitation at some time **t** on or after that last action potential is given by\n\n' +
            '> **C(t) = C0 + α sum(ti ≤ t; exp(-(t- ti) / τc))**\n\n' +
            'where **C0** is the base, **α** is the magnitude, and **τc** is the time-constant. The sum runs ' +
            'over all the action-potential times **ti** for which **ti ≤ t**.\n',
        defaultValue: 100,
        units: 'ms'
    }],
    ['dpb', {
        name: 'dpb',
        detail: 'depletion_base',
        description: 'The depletion base **V0** for the signal release probability. ' +
            'The depletion is given by\n\n' +
            '> **V(t) = max(0, V0 - β sum(ti ≤ t; exp(-(t - ti) / τv)))**\n\n' +
            'where **V0** is the base, **β** is the magnitude, and **τv** is the time-constant. The sum runs over ' +
            'all the action-potential times **ti** for which **ti ≤ t**, and for which the action potential caused ' +
            'a release.',
        defaultValue: 1000
    }],
    ['dpm', {
        name: 'dpm',
        detail: 'depletion_magnitude',
        description: 'The depletion magnitude **β** for the signal release probability. ' +
            'The depletion is given by\n\n' +
            '> **V(t) = max(0, V0 - β sum(ti ≤ t; exp(-(t - ti) / τv)))**\n\n' +
            'where **V0** is the base, **β** is the magnitude, and **τv** is the time-constant. The sum runs over ' +
            'all the action-potential times **ti** for which **ti ≤ t**, and for which the action potential caused ' +
            'a release.',
        defaultValue: 0.1
    }],
    ['dpt', {
        name: 'dpt',
        detail: 'depletion_time_constant',
        description: 'The depletion time-constant **τv** for the signal release probability. ' +
            'The depletion is given by\n\n' +
            '> **V(t) = max(0, V0 - β sum(ti ≤ t; exp(-(t - ti) / τv)))**\n\n' +
            'where **V0** is the base, **β** is the magnitude, and **τv** is the time-constant. The sum runs over ' +
            'all the action-potential times **ti** for which **ti ≤ t**, and for which the action potential caused ' +
            'a release.',
        defaultValue: 100,
        units: 'ms'
    }],
]);
const synapseReleaseProbTemplate = createTemplatePart('', srpOrder, synapseReleaseProbVariables, '', 0);
const synapseReleaseProbDefaultsTemplate = createDefaultsTemplatePart('', srpOrder, synapseReleaseProbVariables, '', 0);

// weight limiting function
const boundedWeightOrder = ['fnc', 'lwb', 'upb'];
const unboundedWeightOrder = ['fnc'];
const boundedWeightLimitingVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'weight_limiting_function',
        description: 'Function that limits this neuron\'s weights by a specified lower and upper bound.',
        defaultValue: 'bnd',
        validValues: ['bnd', 'unb']
    }],
    ['lwb', {
        name: 'lwb',
        detail: 'weight_lower_bound',
        description: 'The minimum value for this neuron\'s connection weights (incoming).',
        defaultValue: 0.0
    }],
    ['upb', {
        name: 'upb',
        detail: 'weight_upper_bound',
        description: 'The maximum value for this neuron\'s connection weights (incoming).',
        defaultValue: 1.0
    }],
]);
const unboundedWeightLimitingVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'weight_limiting_function',
        description: 'Function that does not limit this neuron\'s weights.',
        defaultValue: 'unb',
        validValues: ['bnd', 'unb']
    }]
]);
const boundedWeightLimitingTemplate = createTemplatePart('', boundedWeightOrder, boundedWeightLimitingVariables, '', 0);
const boundedWeightLimitingDefaultsTemplate = createDefaultsTemplatePart('', boundedWeightOrder, boundedWeightLimitingVariables, '', 0);
const unboundedWeightLimitingTemplate = createTemplatePart('', unboundedWeightOrder, unboundedWeightLimitingVariables, '', 0);
const unboundedWeightLimitingDefaultsTemplate = createDefaultsTemplatePart('', unboundedWeightOrder, boundedWeightLimitingVariables, '', 0);

// location function
const locationOrder = ['cst', 'px1', 'px2', 'px3'];
const cartesianLocationVariables = new Map<string, Variable>([
    ['cst', {
        name: 'cst',
        detail: 'coordinate_system',
        description: 'The cartesian coordinate system with **(x, y, z)** coordinates.',
        defaultValue: 'ct',
        validValues: ['ct', 'cl', 'sp']
    }],
    ['px1', {
        name: 'px1',
        detail: 'x',
        description: '*px1* represents **x**',
        units: 'µm',
        defaultValue: 0
    } as Variable],
    ['px2', {
        name: 'px2',
        detail: 'y',
        description: '*px2* represents **y**',
        units: 'µm',
        defaultValue: 0
    } as Variable],
    ['px3', {
        name: 'px3',
        detail: 'z',
        description: '*px3* represents **z**',
        units: 'µm',
        defaultValue: 0
    } as Variable],
]);
const cylindricalLocationVariables = new Map<string, Variable>([
    ['cst', {
        name: 'cst',
        detail: 'coordinate_system',
        description: 'The cylindrical coordinate system with **(r, ϕ, z)** coordinates. The value ' +
            '**r** is the distance from the origin in the xy-plane. The value **ϕ** is the angle from ' +
            'the x-axis in the xy-plane. And **z** is the height above the xy-plane.',
        defaultValue: 'cl',
        validValues: ['ct', 'cl', 'sp']
    }],
    ['px1', {
        name: 'px1',
        detail: 'r',
        description: '*px1* represents **r**, which is the distance from the origin in the xy-plane',
        units: 'µm',
        defaultValue: 0
    } as Variable],
    ['px2', {
        name: 'px2',
        detail: 'ϕ',
        description: '*px2* represents **ϕ**, which is the angle from the x-axis in the xy-plane',
        defaultValue: 0
    } as Variable],
    ['px3', {
        name: 'px3',
        detail: 'z',
        description: '*px3* represents **z**, which is the height above the xy-plane',
        units: 'µm',
        defaultValue: 0
    } as Variable],
]);
const sphericalLocationVariables = new Map<string, Variable>([
    ['cst', {
        name: 'cst',
        detail: 'coordinate_system',
        description: 'The spherical coordinate system with **(r, ϕ, θ)** coordinates. The value ' +
            '**r** is the distance from the origin in the xy-plane. The value **ϕ** is the angle from ' +
            'the x-axis in the xy-plane. And **θ** is the angle from the z-axis',
        defaultValue: 'sp',
        validValues: ['ct', 'cl', 'sp']
    }],
    ['px1', {
        name: 'px1',
        detail: 'r',
        description: '*px1* represents **r**, which is the distance from the origin in the xy-plane',
        units: 'µm',
        defaultValue: 0
    } as Variable],
    ['px2', {
        name: 'px2',
        detail: 'ϕ',
        description: '*px2* represents **ϕ**, which is the angle from the x-axis in the xy-plane',
        defaultValue: 0
    } as Variable],
    ['px3', {
        name: 'px3',
        detail: 'θ',
        description: '*px3* represents **θ**, which is the angle from the z-axis',
        defaultValue: 0
    } as Variable],
]);
const cartesianLocationTemplate = createTemplatePart('', locationOrder, cartesianLocationVariables, '', 0);
const cylindricalLocationTemplate = createTemplatePart('', locationOrder, cylindricalLocationVariables, '', 0);
const sphericalLocationTemplate = createTemplatePart('', locationOrder, sphericalLocationVariables, '', 0);

//
// neuron templates
const neuronTemplate = [
    createTemplatePart('', neuronBaseVarsOrder, neuronBaseVariables, ',', 0),
    createTemplatePart('\tWDF=(', weightDecayOrder, weightDecayVariables, '),', neuronBaseVarsOrder.length),
    createTemplatePart('\tSRP=(', srpOrder, synapseReleaseProbVariables, '),', neuronBaseVarsOrder.length + weightDecayOrder.length),
    createTemplatePart('\tWLF=(', boundedWeightOrder, boundedWeightLimitingVariables, '),', neuronBaseVarsOrder.length + weightDecayOrder.length + srpOrder.length),
    createTemplatePart('\tLOC=(', locationOrder, cartesianLocationVariables, ')', neuronBaseVarsOrder.length + weightDecayOrder.length + srpOrder.length + boundedWeightOrder.length),
].join('\n');

const neuronDefaultsTemplate = [
    createDefaultsTemplatePart('', neuronBaseVarsOrder, neuronBaseVariables, ',', 0),
    createDefaultsTemplatePart('\tWDF=(', zeroWeightDecayOrder, zeroWeightDecayVariables, '),', neuronBaseVarsOrder.length),
    createDefaultsTemplatePart('\tSRP=(', srpOrder, synapseReleaseProbVariables, '),', neuronBaseVarsOrder.length + zeroWeightDecayOrder.length),
    createDefaultsTemplatePart('\tWLF=(', boundedWeightOrder, boundedWeightLimitingVariables, '),', neuronBaseVarsOrder.length + zeroWeightDecayOrder.length + srpOrder.length),
    createDefaultsTemplatePart('\tLOC=(', locationOrder, cartesianLocationVariables, ')', neuronBaseVarsOrder.length + weightDecayOrder.length + srpOrder.length + boundedWeightOrder.length),
].join('\n');


const connectionOrder = ['prn', 'psn', 'cnw', 'eqw', 'lrn'];
const connectionVariables = new Map<string, Variable>([
    ['prn', {name: 'prn', detail: 'pre_synaptic_neuron', description: 'ID of the pre-synaptic neuron.'} as Variable],
    ['psn', {name: 'psn', detail: 'post_synaptic_neuron', description: 'ID of the post-synaptic neuron'} as Variable],
    ['cnw', {name: 'cnw', detail: 'connection_weight', description: 'The initial connection weight.', defaultValue: 1}],
    ['eqw', {
        name: 'eqw',
        detail: 'equilibrium_weight',
        description: 'The equilibrium connection weight is the value that the connection weight decays to ' +
            'in the manner defined by the weight-decay function in the neuron.',
        defaultValue: 1
    }],
    ['lrn', {
        name: 'lrn',
        detail: 'learning_function',
        description: 'The learning function used to update the connection weights when spikes ' +
            'arrive from the pre-synaptic neuron. The learning functions are defined in the **LRN** section. ' +
            'Although only the learning functions defined in the **LRN** section are valid, there are generally ' +
            'four learning functions.' +
            '\n 1. **stdp_soft** -- STDP with linear excitation/inhibition magnitudes' +
            '\n 2. **stdp_hard** -- STDP with Heaviside function for excitation/inhibition magnitudes' +
            '\n 3. **stdp_alpha** -- STDP with excitation/inhibition magnitudes described by an alpha function' +
            '\n 4. **flat** - learning is off and weights are not adjusted based on spike timing.',
        defaultValue: 'stdp_alpha',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    }]
]);
const connectionTemplate = createTemplatePart('', connectionOrder, connectionVariables, '', 0);
const connectionDefaultsTemplate = createDefaultsTemplatePart('', connectionOrder, connectionVariables, '', 0);

const learningVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'learning_function',
        description: 'learning function',
        defaultValue: 'stdp_alpha',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    } as Variable],
]);
const stdpSoftHardOrder = ['fnc', 'ina', 'inp', 'exa', 'exp'];
const stdpSoftVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'learning_function',
        description: 'The spike-timing dependent plasticity learning function using a soft limit.',
        defaultValue: 'stdp_soft',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    } as Variable],
    ['ina', {
        name: 'ina',
        detail: 'inhibition_amplitude',
        description: 'inhibition amplitude (STDP-soft)',
        defaultValue: 0.06
    } as Variable],
    ['inp', {
        name: 'inp',
        detail: 'inhibition_period',
        description: 'inhibition period (STDP-soft)',
        defaultValue: 15,
        units: 'ms'
    } as Variable],
    ['exa', {
        name: 'exa',
        detail: 'excitation_amplitude',
        description: 'excitation amplitude (STDP-soft)',
        defaultValue: 0.02
    } as Variable],
    ['exp', {
        name: 'exp',
        detail: 'excitation_period',
        description: 'excitation period (STDP-soft)',
        defaultValue: 10,
        units: 'ms'
    } as Variable],
]);
const stdpHardVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'learning_function',
        description: 'The spike-timing dependent plasticity learning function using a hard limit.',
        defaultValue: 'stdp_hard',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    } as Variable],
    ['ina', {
        name: 'ina',
        detail: 'inhibition_amplitude',
        description: 'inhibition amplitude (STDP-hard)',
        defaultValue: 0.06
    } as Variable],
    ['inp', {
        name: 'inp',
        detail: 'inhibition_period',
        description: 'inhibition period (STDP-hard)',
        defaultValue: 15,
        units: 'ms'
    } as Variable],
    ['exa', {
        name: 'exa',
        detail: 'excitation_amplitude',
        description: 'excitation amplitude (STDP-hard)',
        defaultValue: 0.02
    } as Variable],
    ['exp', {
        name: 'exp',
        detail: 'excitation_period',
        description: 'excitation period (STDP-hard)',
        defaultValue: 10,
        units: 'ms'
    } as Variable],
]);
const stdpAlphaOrder = ['fnc', 'bln', 'alr', 'atc'];
const stdpAlphaVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'learning_function',
        description: 'The spike-timing dependent plasticity learning function using an alpha-function limit.',
        defaultValue: 'stdp_alpha',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    } as Variable],
    ['bln', {name: 'bln', detail: 'baseline', description: 'baseline (STDP-α)', defaultValue: -1} as Variable],
    ['alr', {
        name: 'alr',
        detail: 'learning_rate',
        description: 'learning rate (STDP-α)',
        defaultValue: 0.04
    } as Variable],
    ['atc', {
        name: 'atc',
        detail: 'learning_time_constant',
        description: 'learning time-constant (STDP-α)',
        defaultValue: 22,
        units: 'ms'
    } as Variable],
]);
const flatLearningVariables = new Map<string, Variable>([
    ['fnc', {
        name: 'fnc',
        detail: 'learning_function',
        description: 'learning function',
        defaultValue: 'flat',
        validValues: ['stdp_alpha', 'stdp_soft', 'stdp_hard', 'flat']
    } as Variable],
]);
const stdpSoftTemplate = createTemplatePart('', stdpSoftHardOrder, stdpSoftVariables, '', 0);
const stdpSoftDefaultsTemplate = createDefaultsTemplatePart('', stdpSoftHardOrder, stdpSoftVariables, '', 0);
const stdpHardTemplate = createTemplatePart('', stdpSoftHardOrder, stdpHardVariables, '', 0);
const stdpHardDefaultsTemplate = createDefaultsTemplatePart('', stdpSoftHardOrder, stdpHardVariables, '', 0);
const stdpAlphaTemplate = createTemplatePart('', stdpAlphaOrder, stdpAlphaVariables, '', 0);
const stdpAlphaDefaultsTemplate = createDefaultsTemplatePart('', stdpAlphaOrder, stdpAlphaVariables, '', 0);
const flatLeaningTemplate = createTemplatePart('', ['fnc'], flatLearningVariables, '', 0);

const localGroupSnippet: languages.CompletionItem = {
    label: "local group",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert local group',
    // eslint-disable-next-line no-template-curly-in-string
    insertText: 'gid=${1:group_id}',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Local execution group.'
} as languages.CompletionItem;

const remoteGroupSnippet: languages.CompletionItem = {
    label: "remote group",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert remote group',
    // eslint-disable-next-line no-template-curly-in-string
    insertText: 'gid=${1:group_id}, hst=${2:hostname}, prt=${3:port}',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Remote execution group.'
} as languages.CompletionItem;

const localGroupParenSnippet: languages.CompletionItem = {
    label: "local group",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert local group',
    // eslint-disable-next-line no-template-curly-in-string
    insertText: '(gid=${1:group_id})',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Local execution group.'
} as languages.CompletionItem;

const remoteGroupParenSnippet: languages.CompletionItem = {
    label: "remote group",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert remote group',
    // eslint-disable-next-line no-template-curly-in-string
    insertText: '(gid=${1:group_id}, hst=${2:hostname}, prt=${3:port})',
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'Remote execution group.'
} as languages.CompletionItem;

//
// completions for neurons
const neuronSnippet: languages.CompletionItem = {
    label: "new neuron",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new neuron',
    insertText: neuronTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New neuron.'
} as languages.CompletionItem;
const neuronParensSnippet: languages.CompletionItem = {
    label: "new neuron",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new neuron',
    insertText: `\n(${neuronTemplate}\n)`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New neuron.'
} as languages.CompletionItem;
const neuronDefaultSnippet: languages.CompletionItem = {
    label: "new default neuron",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new neuron with default values',
    insertText: neuronDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New neuron with reasonable default values.'
} as languages.CompletionItem;
const neuronDefaultParensSnippet: languages.CompletionItem = {
    label: "new default neuron",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new neuron with default values',
    insertText: `\n(${neuronDefaultsTemplate}\n)`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New neuron with reasonable default values.'
} as languages.CompletionItem;

//
// completions for weight decay function
const zeroWeightDecaySnippet: languages.CompletionItem = {
    label: "new zero weight decay function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert zero weight decay function',
    insertText: zeroWeightDecayTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New zero weight decay function.'
} as languages.CompletionItem;
const weightDecaySnippet: languages.CompletionItem = {
    label: "new exponential weight decay function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert exponential weight decay function',
    insertText: weightDecayTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New exponential  weight decay function.'
} as languages.CompletionItem;
const weightDecayDefaultsSnippet: languages.CompletionItem = {
    label: "new exponential weight decay function with default values",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert exponential weight decay function with default values',
    insertText: weightDecayDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New exponential  weight decay function with default values.'
} as languages.CompletionItem;

//
// completions for signal release probability function
const signalReleaseProbSnippet: languages.CompletionItem = {
    label: "new synapse release probability function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert synapse release probability function',
    insertText: synapseReleaseProbTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New synapse release probability function.'
} as languages.CompletionItem;
const signalReleaseProbDefaultsSnippet: languages.CompletionItem = {
    label: "new default synapse release probability function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert default synapse release probability function',
    insertText: synapseReleaseProbDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New default synapse release probability function.'
} as languages.CompletionItem;

//
// completions for weight-limiting function
const boundedWeightLimitingSnippet: languages.CompletionItem = {
    label: "new bounded weight-limiting function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert bounded weight-limiting function',
    insertText: boundedWeightLimitingTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New bounded weight-limiting function.'
} as languages.CompletionItem;
const boundedWeightLimitingDefaultsSnippet: languages.CompletionItem = {
    label: "new default bounded weight-limiting function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert default bounded weight-limiting function',
    insertText: boundedWeightLimitingDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New default bounded weight-limiting function.'
} as languages.CompletionItem;
const unboundedWeightLimitingSnippet: languages.CompletionItem = {
    label: "new unbounded weight-limiting function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert unbounded weight-limiting function',
    insertText: unboundedWeightLimitingTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New unbounded weight-limiting function.'
} as languages.CompletionItem;
const unboundedWeightLimitingDefaultsSnippet: languages.CompletionItem = {
    label: "new default unbounded weight-limiting function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert default unbounded weight-limiting function',
    insertText: unboundedWeightLimitingDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New default unbounded weight-limiting function.'
} as languages.CompletionItem;

//
// completions for location function
const cartesianLocationSnippet: languages.CompletionItem = {
    label: "new cartesian location",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new cartesian location',
    insertText: cartesianLocationTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New cartesian location.'
} as languages.CompletionItem;
const cylindricalLocationSnippet: languages.CompletionItem = {
    label: "new cylindrical location",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new cylindrical location',
    insertText: cylindricalLocationTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New cylindrical location.'
} as languages.CompletionItem;
const sphericalLocationSnippet: languages.CompletionItem = {
    label: "new spherical location",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new spherical location',
    insertText: sphericalLocationTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New spherical location.'
} as languages.CompletionItem;


//
// completions for connections
const connectionSnippet: languages.CompletionItem = {
    label: "new connection",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new connection',
    insertText: connectionTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New connection'
} as languages.CompletionItem;
const connectionDefaultsSnippet: languages.CompletionItem = {
    label: "new default connection",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new connection with default values',
    insertText: connectionDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New connection with reasonable default values.'
} as languages.CompletionItem;
const connectionParenSnippet: languages.CompletionItem = {
    label: "new connection",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new connection',
    insertText: `\n(${connectionTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New connection'
} as languages.CompletionItem;
const connectionDefaultsParenSnippet: languages.CompletionItem = {
    label: "new default connection",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new connection with default values',
    insertText: `\n(${connectionDefaultsTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New connection with reasonable default values.'
} as languages.CompletionItem;

const stdpSoftSnippet: languages.CompletionItem = {
    label: "new STDP-soft learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-soft learning function',
    insertText: stdpSoftTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-soft learning function.'
} as languages.CompletionItem;
const stdpSoftDefaultsSnippet: languages.CompletionItem = {
    label: "new STDP-soft learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-soft learning function with default values',
    insertText: stdpSoftDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-soft learning function with reasonable default values.'
} as languages.CompletionItem;
const stdpSoftParenSnippet: languages.CompletionItem = {
    label: "new STDP-soft learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-soft learning function',
    insertText: `\n(${stdpSoftTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-soft learning function.'
} as languages.CompletionItem;
const stdpSoftDefaultsParenSnippet: languages.CompletionItem = {
    label: "new STDP-soft learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-soft learning function with default values',
    insertText: `\n(${stdpSoftDefaultsTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-soft learning function with reasonable default values.'
} as languages.CompletionItem;
const stdpHardSnippet: languages.CompletionItem = {
    label: "new STDP-hard learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-hard learning function',
    insertText: stdpHardTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-hard learning function.'
} as languages.CompletionItem;
const stdpHardDefaultsSnippet: languages.CompletionItem = {
    label: "new STDP-hard learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-hard learning function with default values',
    insertText: stdpHardDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-hard learning function with reasonable default values.'
} as languages.CompletionItem;
const stdpHardParenSnippet: languages.CompletionItem = {
    label: "new STDP-hard learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-hard learning function',
    insertText: `\n(${stdpHardTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-hard learning function.'
} as languages.CompletionItem;
const stdpHardDefaultsParenSnippet: languages.CompletionItem = {
    label: "new STDP-hard learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-hard learning function with default values',
    insertText: `\n(${stdpHardDefaultsTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-hard learning function with reasonable default values.'
} as languages.CompletionItem;
const stdpAlphaSnippet: languages.CompletionItem = {
    label: "new STDP-α learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-α learning function',
    insertText: stdpAlphaTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-α learning function.'
} as languages.CompletionItem;
const stdpAlphaDefaultsSnippet: languages.CompletionItem = {
    label: "new STDP-α learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-α learning function with default values',
    insertText: stdpAlphaDefaultsTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-α learning function with reasonable default values.'
} as languages.CompletionItem;
const stdpAlphaParenSnippet: languages.CompletionItem = {
    label: "new STDP-α learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-α learning function',
    insertText: `\n(${stdpAlphaTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new STDP-α learning function.'
} as languages.CompletionItem;
const stdpAlphaDefaultsParenSnippet: languages.CompletionItem = {
    label: "new STDP-α learning function defaults",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new STDP-α learning function with default values',
    insertText: `\n(${stdpAlphaDefaultsTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New STDP-α learning function with reasonable default values.'
} as languages.CompletionItem;
const flatLearningSnippet: languages.CompletionItem = {
    label: "new flat learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new flat learning function',
    insertText: flatLeaningTemplate,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new flat learning function (i.e. no learning).'
} as languages.CompletionItem;
const flatLearningParenSnippet: languages.CompletionItem = {
    label: "new flat learning function",
    kind: languages.CompletionItemKind.Snippet,
    detail: 'insert new flat learning function',
    insertText: `\n(${flatLeaningTemplate})`,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: 'New new flat learning function (i.e. no learning).'
} as languages.CompletionItem;

// map that holds the regular expressions used to determine whether the cursor is in
// an item (used by the selectionsForField(...) function)
const REGEX_MAP = regexMap(lastKeyHasValueOf);


/**
 * Creates the string representing part (or all of) a code snippet from the variable information specified. Code
 * snippets are a concatenation of `field=${index:value}` strings. The index specifies the order in which the
 * code (field, value) pair appear in the code snippet.
 * @param prefix A string the prepends the code snippet
 * @param order The variable names in the order they should appear in the code snippet. Only
 * variables whose name match one of these variables will appear in the code snippet
 * @param vars The (name, variable_info) pairs used to create the code snippet
 * @param postfix A string appended to the code snippet
 * @param offset The offset applied to the index.
 * @return a concatenation of `field=${index:value}` strings. The index specifies the order in which the
 * code (field, value) pair appear in the code snippet. The value is the name of the field.
 */
function createTemplatePart(prefix: string,
                            order: Array<string>,
                            vars: Map<string, Variable>,
                            postfix: string,
                            offset: number): string {
    const part = order
        .map((field, i) => {
            const units = vars.get(field)?.units;
            const unitsPostfix = units ? `${' ' + units}` : '';
            return `${field}=$\{${i + offset}:${vars.get(field)?.detail}${unitsPostfix}}`
        })
        .join(', ');

    return prefix + part + postfix;
}

/**
 * Similar to the {@link #createTemplatePart} function, this function creates the string representing part (or all of)
 * a code snippet from the variable information specified. Code snippets are a concatenation of `field=${index:value}`
 * strings. The index specifies the order in which the code (field, value) pair appear in the code snippet.
 *
 * However, rather than return the name of the field as the value, this function attempts to return the field's
 * default value. If no default exists, then returns the name of the field.
 * @param prefix A string the prepends the code snippet
 * @param order The variable names in the order they should appear in the code snippet. Only
 * variables whose name match one of these variables will appear in the code snippet
 * @param vars The (name, variable_info) pairs used to create the code snippet
 * @param postfix A string appended to the code snippet
 * @param offset The offset applied to the index.
 * @return a concatenation of `field=${index:value}` strings. The index specifies the order in which the
 * code (field, value) pair appear in the code snippet. The value is the default value, if one exists, otherwise it
 * is the name of the field.
 */
function createDefaultsTemplatePart(prefix: string,
                                    order: Array<string>,
                                    vars: Map<string, Variable>,
                                    postfix: string,
                                    offset: number): string {
    const part = order
        .map((field, i) => {
            const defaultValue = vars.get(field)?.defaultValue;
            const value = defaultValue !== undefined ? defaultValue : vars.get(field)?.detail;
            const units = vars.get(field)?.units;
            const unitsPostfix = units ? `${' ' + units}` : '';
            return `${field}=$\{${i + offset}:${value}${unitsPostfix}}`;
        })
        .join(', ');

    return prefix + part + postfix;
}

/**
 * Attempts to extract the field name from the spikes line of code, which consists of (name, value) pairs represented
 * as `name=value`. The name will always have 3 characters
 * @param line The line of spikes code
 * @param position The position from which to extract the property
 * @return
 */
function extractFieldNameFrom(line: string, position: number): string {
    // process the line by chopping off everything after the position and removing all the white space
    const stripped = line.slice(0, position - 2).replace(/\s*/g, '');
    // now grab the three-letter field name before the equals sign
    return stripped.length >= 4 ? stripped.slice(stripped.length - 3, stripped.length) : '';
}

/**
 * For a set of variables, calculates the completion items. A completion item contains the information needed
 * to create the completions from which a user can select.
 * @param selections The map holding the field names and their associated variable info
 * @param position The position of the cursor
 * @return An array of the completion items for the variables
 */
function completionsFor(selections: Map<string, Variable>, position: IPosition): Array<languages.CompletionItem> {
    // calculates the range for the given position
    function rangeFrom(position: IPosition): IRange {
        return {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
        }
    }

    return Array
        .from(selections.values())
        .map(variable => ({
            label: variable.name,
            kind: languages.CompletionItemKind.Value,
            detail: variable.detail,
            insertText: `${variable.name}=${variable.defaultValue}${variable.units ? ` ${variable.units}` : ''}`,
            insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
            range: rangeFrom(position),
            documentation: variable.description
        } as languages.CompletionItem));
}

/**
 * Calculates the completion list for the field, taking into account the valid values a field may have, and
 * if the field doesn't have a list of valid values, then displays the default value, and if the field doesn't
 * have a default, then just the completion for the field.
 * @param variable The variable for which to calculate the completion list
 * @return The list of completions for the variable
 */
function completionsForField(variable: Variable): Array<languages.CompletionItem> {
    if (variable.validValues !== undefined) {
        return variable.validValues
            .map(value => ({
                label: value,
                kind: languages.CompletionItemKind.Value,
                detail: value,
                insertText: `${value}${variable.units ? ` ${variable.units}` : ''}`,
                insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
                documentation: value
            } as languages.CompletionItem));
    } else if (variable.defaultValue !== undefined) {
        const defaultValue = `${variable.defaultValue}${variable.units ? ` ${variable.units}` : ''}`;
        return [{
            label: `${variable.name} (${defaultValue})`,
            kind: languages.CompletionItemKind.Value,
            detail: `${variable.detail} (${defaultValue})`,
            insertText: defaultValue,
            insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
            documentation: variable.description
        } as languages.CompletionItem];
    } else {
        return [{
            label: variable.name,
            kind: languages.CompletionItemKind.Value,
            detail: variable.detail,
            insertText: `${variable.defaultValue}${variable.units ? ` ${variable.units}` : ''}`,
            insertTextRules: languages.CompletionItemInsertTextRule.KeepWhitespace,
            documentation: variable.description
        } as languages.CompletionItem];
    }
}

/**
 * Creates a map that holds the variable sections to a function that returns whether the current
 * line and/or the text hold the key-value pair of some relevant portion of it.
 * @param {(key: string, value: string, text: string, line: string) => boolean} lastKeyHasValueOf Function
 * used to resolve which similar sections match. For example, which coordinate system does "cst" or "px1"
 * belong to.
 * @return {Map<string, (text: string, line: string) => boolean>} The map holding the section and the
 * regex match functions.
 */
export function regexMap(lastKeyHasValueOf: (key: string, value: string, text: string, line: string) => boolean): Map<string, (text: string, line: string) => boolean> {
    return new Map<string, (text: string, line: string) => boolean>([
        ['group', (text, _) => text.match(inGrpRe) !== null],
        ['neuronBase', (text, _) => text.match(inNrnRe) !== null],
        ['weightDecay', (text, _) => text.match(inWdfRe) !== null],
        ['srp', (text, _) => text.match(inSrpRe) !== null],
        ['boundedWeight', (text, _) => text.match(inWlfRe) !== null],
        ['unboundedWeight', (text, _) => text.match(inWlfRe) !== null],
        ['cartesian', (text, line) => text.match(inLocRe) !== null && lastKeyHasValueOf("cst", "ct", text, line)],
        ['cylindrical', (text, line) => text.match(inLocRe) !== null && lastKeyHasValueOf("cst", "cl", text, line)],
        ['spherical', (text, line) => text.match(inLocRe) !== null && lastKeyHasValueOf("cst", "sp", text, line)],
        ['connection', (text, _) => text.match(inConRe) !== null],
        ['softStdpLearning', (text, line) => text.match(inLrnRe) !== null && lastKeyHasValueOf("fnc", "stdp_soft", text, line)],
        ['hardStdpLearning', (text, line) => text.match(inLrnRe) !== null && lastKeyHasValueOf("fnc", "stdp_hard", text, line)],
        ['alphaStdpLearning', (text, line) => text.match(inLrnRe) !== null && lastKeyHasValueOf("fnc", "stdp_alpha", text, line)],
        ['flatLearning', (text, line) => text.match(inLrnRe) !== null && lastKeyHasValueOf("fnc", "flat", text, line)],
    ])
}

/**
 * Determines whether the value of the last key has the specified value.
 * @param key The key
 * @param value The values that the last value of the key is being tested for
 * @param text The stripped text
 * @param line The current line
 * @return `true` if the value of the last key has the specified value; `false` otherwise
 */
function lastKeyHasValueOf(key: string, value: string, text: string, line: string): boolean {
    // if the key-value pair is found, then value was found
    if (text.lastIndexOf(`${key}=${value}`) > -1) {
        return true;
    }

    // otherwise we look at some special cases that require that at least the "key=" string
    // is found
    const strippedLine = stripText(line);
    return text.lastIndexOf(`${key}=`) > -1 && (
        // adding new value when an existing value is already there
        strippedLine.lastIndexOf(`${key}==${value}`) > -1 ||
        // adding new value when other values are part of the element (i.e. neuron, location, etc)
        strippedLine.lastIndexOf(`${key}=,`) > -1 ||
        // this is a new element and being filled out
        strippedLine.match(`${key}=$`) != null
    );
}

/**
 * Returns a map holding all the completion variables that match the field name, keyed by
 * the groups for which the completion applies.
 * @param fieldName The name of the field for which to find variables
 * @return A map holding all of the variables that have the
 * specified field
 */
export function allCompletionVariablesFor(fieldName: string): Map<string, Variable> {
    return new Map<string, Variable>((
        [
            // neuron groups
            ['group', groupVariables.get(fieldName)],
            // neurons
            ['neuronBase', neuronBaseVariables.get(fieldName)],
            ['weightDecay', weightDecayVariables.get(fieldName)],
            ['srp', synapseReleaseProbVariables.get(fieldName)],
            ['boundedWeight', boundedWeightLimitingVariables.get(fieldName)],
            ['unboundedWeight', unboundedWeightLimitingVariables.get(fieldName)],
            ['cartesian', cartesianLocationVariables.get(fieldName)],
            ['cylindrical', cylindricalLocationVariables.get(fieldName)],
            ['spherical', sphericalLocationVariables.get(fieldName)],
            // connection
            ['connection', connectionVariables.get(fieldName)],
            // learning
            ['softStdpLearning', stdpSoftVariables.get(fieldName)],
            ['hardStdpLearning', stdpHardVariables.get(fieldName)],
            ['alphaStdpLearning', stdpAlphaVariables.get(fieldName)],
            ['flatLearning', flatLearningVariables.get(fieldName)],
        ] as Array<[string, Variable | undefined]>)
        .filter((entry: [string, Variable | undefined]) => entry[1] !== undefined) as Array<[string, Variable]>);
}

/**
 * For a specific field, calculates the completion items.
 * @param fieldName The name of the field
 * @param strippedText The text, stripped of comments, whitespace and return characters, up
 * until the current cursor.
 * @param currentLine The line of text on which the cursor sits
 * @return A list of suggestions
 */
function selectionsForField(fieldName: string, strippedText: string, currentLine: string): Array<languages.CompletionItem> {
    // find all the instances of the field name in the variables, and if the name is not unique, then do further
    // processing to figure out the selection
    const variables = allCompletionVariablesFor(fieldName);

    // when the field name is unique, then all that is left to do is to calculate the list of completions for
    // the field and return that list
    if (variables.size === 1) {
        return completionsForField(variables.values().next().value);
    }

    // when there is a conflict, then need to use the stripped text to figure out where in the text the user is.
    // so for each place where the field name matches, check if the regex matches
    for (const [key, variable] of Array.from(variables.entries())) {
        const testFunc = REGEX_MAP.get(key);
        if (testFunc && testFunc(strippedText, currentLine)) {
            return completionsForField(variable);
        }
    }

    // give up
    return [];
}

/**
 * When the user types an equal sign (i.e. "=") this signifies the intent to add a value to a field.
 * Depending on where the cursor is, returns the values appropriate for that field.
 * @param currentLine The current line of text
 * @param position The current position of the cursor (line, column)
 * @param strippedText The text, stripped of comments, whitespace and return characters, up
 * until the current cursor.
 * @return A provider holding a list of suggestions
 */
function handleTriggerEquals(currentLine: string,
                             position: IPosition,
                             strippedText: string
): languages.ProviderResult<languages.CompletionList> {
    const fieldName = extractFieldNameFrom(currentLine, position.column);
    return {suggestions: selectionsForField(fieldName, strippedText, currentLine)};
}

/**
 * When the user types an open-parenthesis (i.e. "(") this signifies the intent to create a new
 * item (i.e. group, neuron, neuron function, connection, or learning function). Depending on the
 * current cursor location, return the templates for creating a new item.
 * @param position The current position of the cursor (line, column)
 * @param strippedText The text, stripped of comments, whitespace and return characters, up
 * until the current cursor.
 * @return A provider holding a list of suggestions
 */
function handleTriggerOpenParens(position: IPosition,
                                 strippedText: string
): languages.ProviderResult<languages.CompletionList> {
    // weight-decay function (neuron function)
    if (strippedText.match(newWdfRe)) {
        const completionsForWeightDecay = completionsFor(weightDecayVariables, position);
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsForWeightDecay, zeroWeightDecaySnippet, weightDecaySnippet, weightDecayDefaultsSnippet
        ];
        return {suggestions};
    }
    // signal-release probability function (neuron function)
    if (strippedText.match(newSrpRe)) {
        const completionsForSrp = completionsFor(synapseReleaseProbVariables, position);
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsForSrp, signalReleaseProbSnippet, signalReleaseProbDefaultsSnippet
        ];
        return {suggestions};
    }
    // weight-limiting function (neuron function)
    if (strippedText.match(newWlfRe)) {
        const completionsForWeightLimiting = completionsFor(boundedWeightLimitingVariables, position);
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsForWeightLimiting,
            boundedWeightLimitingSnippet, boundedWeightLimitingDefaultsSnippet,
            unboundedWeightLimitingSnippet, unboundedWeightLimitingDefaultsSnippet
        ];
        return {suggestions};
    }
    // location function (neuron function)
    if (strippedText.match(newLocRe)) {
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsFor(cartesianLocationVariables, position),
            cartesianLocationSnippet, cylindricalLocationSnippet, sphericalLocationSnippet
        ];
        return {suggestions};
    }

    // new neuron group
    if (strippedText.match(newGrpRe)) {
        const completionsForGroup = completionsFor(groupVariables, position);
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsForGroup, localGroupSnippet, remoteGroupSnippet
        ];
        return {suggestions};
    }

    // new neuron
    if (strippedText.match(newNrnRe)) {
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsFor(neuronBaseVariables, position), neuronSnippet, neuronDefaultSnippet
        ]
        return {suggestions};
    }

    // new connection
    if (strippedText.match(newConRe)) {
        const completionsForConnection = completionsFor(connectionVariables, position);
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsForConnection, connectionSnippet, connectionDefaultsSnippet
        ]
        return {suggestions};
    }

    // new learning function
    if (strippedText.match(newLrnRe)) {
        const suggestions: Array<languages.CompletionItem> = [
            ...completionsFor(stdpSoftVariables, position), stdpSoftSnippet, stdpSoftDefaultsSnippet,
            ...completionsFor(stdpHardVariables, position), stdpHardSnippet, stdpHardDefaultsSnippet,
            ...completionsFor(stdpAlphaVariables, position), stdpAlphaSnippet, stdpAlphaDefaultsSnippet,
            ...completionsFor(flatLearningVariables, position), flatLearningSnippet
        ]
        return {suggestions};
    }
    return {suggestions: []};
}

/**
 * When the user types a comma, then we can look for completions
 * @param currentLine The current line of text
 * @param position The current position of the cursor (line, column)
 * @param strippedText The text, stripped of comments, whitespace and return characters, up
 * until the current cursor.
 * @return A provider holding a list of suggestions
 */
function handleTriggerComma(currentLine: string,
                            position: IPosition,
                            strippedText: string
): languages.ProviderResult<languages.CompletionList> {
    //
    // groups
    //
    // is the cursor in the GRP section, but not in a group. in this case, provide
    // a new group completion
    if (strippedText.match(inGrpsSecRe)) {
        return {suggestions: [localGroupParenSnippet, remoteGroupParenSnippet], incomplete: false};
    }
    // is the cursor in a group. in this case, provide a list of group fields
    if (strippedText.match(inGrpRe)) {
        return {suggestions: completionsFor(groupVariables, position), incomplete: false};
    }

    //
    // neurons
    //
    // when the neuron is in one of the functions then return the completion for the function
    if (strippedText.match(inWdfRe)) {
        return {suggestions: completionsFor(weightDecayVariables, position)};
    }
    // when the neuron is in one of the functions then return the completion for the function
    if (strippedText.match(inSrpRe)) {
        return {suggestions: completionsFor(synapseReleaseProbVariables, position)};
    }
    // when the neuron is in one of the functions then return the completion for the function
    if (strippedText.match(inWlfRe)) {
        return {suggestions: completionsFor(boundedWeightLimitingVariables, position)};
    }
    // when the neuron is in one of the functions then return the completion for the function
    if (strippedText.match(inLocRe)) {
        const strippedCurrent = stripText(currentLine);
        if (strippedCurrent.match(/cst=cl/)) {
            return {suggestions: completionsFor(cylindricalLocationVariables, position)};
        }
        if (strippedCurrent.match(/cst=sp/)) {
            return {suggestions: completionsFor(sphericalLocationVariables, position)};
        }
        // default is for cartesian
        return {suggestions: completionsFor(cartesianLocationVariables, position)};
    }
    // when the cursor is in the NRN section, but not in a neuron, then show the completions
    // for a default neuron or a neuron template
    if (inNeuronSection(strippedText)) {
        return {suggestions: [neuronParensSnippet, neuronDefaultParensSnippet]};
    }
    // when the cursor is in the neuron, at this point, it is not in one of the neuron
    // functions, nor is it in the neuron section, so it must be in the base neuron
    if (strippedText.match(inNrnRe)) {
        return {suggestions: completionsFor(neuronBaseVariables, position)};
    }

    //
    // connections
    //
    if (strippedText.match(inConsSecRe)) {
        return {suggestions: [connectionParenSnippet, connectionDefaultsParenSnippet], incomplete: false}
    }
    if (strippedText.match(inConRe)) {
        return {suggestions: completionsFor(connectionVariables, position)}
    }

    //
    // learning
    //
    if (strippedText.match(inLrnsSecRe)) {
        return {
            suggestions: [
                stdpSoftParenSnippet, stdpSoftDefaultsParenSnippet,
                stdpHardParenSnippet, stdpHardDefaultsParenSnippet,
                stdpAlphaParenSnippet, stdpAlphaDefaultsParenSnippet,
                flatLearningParenSnippet
            ],
            incomplete: false
        }
    }
    if (strippedText.match(inLrnRe)) {
        // attempt to determine what type of learning function it is and return
        // the respective fields
        const fnc = currentLine.lastIndexOf("fnc=");
        if (fnc >= 0 && currentLine.lastIndexOf("stdp_soft") >= 0) {
            return {suggestions: completionsFor(stdpSoftVariables, position)}
        }
        if (fnc >= 0 && currentLine.lastIndexOf("stdp_hard") >= 0) {
            return {suggestions: completionsFor(stdpHardVariables, position)}
        }
        if (fnc >= 0 && currentLine.lastIndexOf("stdp_alpha") >= 0) {
            return {suggestions: completionsFor(stdpAlphaVariables, position)}
        }
        if (fnc >= 0 && currentLine.lastIndexOf("flat") >= 0) {
            return {suggestions: completionsFor(flatLearningVariables, position)}
        }
        // unable to determine the learning function type, so return everything
        return {
            suggestions: [
                ...completionsFor(learningVariables, position),
                ...completionsFor(stdpSoftVariables, position),
                ...completionsFor(stdpHardVariables, position),
                ...completionsFor(stdpAlphaVariables, position),
                ...completionsFor(flatLearningVariables, position),
            ]
        }
    }
    return {suggestions: []};
}

/**
 * Returns the completion items that correspond to the current cursor location. For example, if
 * the cursor is in a group, then returns a list of the group attributes (i.e. gid, hst, prt).
 * As another example, if the cursor is in the GRP section, but outside a group, then returns
 * the group templates (one with default values, and one with placeholders.
 * @param model The model holding the text
 * @param position The current cursor position
 * @param context The context surrounding the completion event
 * @param token The cancellation token
 * @return The list of completion items
 */
function completionItems(model: editor.ITextModel,
                         position: IPosition,
                         context: languages.CompletionContext,
                         token: CancellationToken): languages.ProviderResult<languages.CompletionList> {
    const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    });
    const strippedText = stripText(textUntilPosition);

    // when the user presses ctrl-space for completion, the trigger kind is 0. when the user types a
    // trigger character, then the trigger kind is 1, and the trigger character is defined.
    if (context.triggerKind === languages.CompletionTriggerKind.Invoke) {
        return handleTriggerComma(model.getLineContent(position.lineNumber), position, strippedText);
    }

    // when the user presses a trigger character (i.e. "=", ",", or "(") then show the completions
    if (context.triggerKind === languages.CompletionTriggerKind.TriggerCharacter) {
        switch (context.triggerCharacter) {
            // when the equals sign is encountered it means a property value, a new neuron function, or a new section (i.e.
            // a GRP, NRN, CON, LRN section)
            case '=':
                return handleTriggerEquals(model.getLineContent(position.lineNumber), position, strippedText);

            // when an open parenthesis is encountered, it means either an new group, neuron, connection, or learning
            // function, or it means a new neuron function (weight limiting, signal release prob, weight decay, location),
            // or a new description.
            case '(':
                return handleTriggerOpenParens(position, strippedText);

            // when the user types a comma, then depending on the location of the cursor, present completion
            // options. for example, if the cursor is in group, then display "gid", "hst", "prt". or if the
            // cursor is in the groups section, but outside the group, then display, "local group" and "remote
            // group".
            case ',':
                return handleTriggerComma(model.getLineContent(position.lineNumber), position, strippedText);

            default:
                return {suggestions: []};
        }
    }

    // the trigger for incomplete completions (languages.CompletionTriggerKind.TriggerForIncompleteCompletions)
    return {suggestions: []};
}

//
// wires all the completions together
//
export const spikesCompletions: languages.CompletionItemProvider = {
    triggerCharacters: ['(', '=', ','],
    provideCompletionItems: completionItems
}
