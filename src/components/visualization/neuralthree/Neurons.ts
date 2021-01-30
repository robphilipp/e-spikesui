import {ThreeContext} from "../basethree/ThreeJsManager";
import {BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, TextureLoader} from "three";
import {threeRender, useThree} from "../basethree/useThree";
import {Coordinate} from "../basethree/Coordinate";
import {useEffect, useRef} from "react";
import {ColorRange} from "./Network";
import {Observable} from "rxjs";
import {NetworkEvent, Spike, SPIKE} from "../../redux/actions/networkEvent";
import {filter} from "rxjs/operators";
import {noop} from "../../../commons";
// import {ball} from "/resources/ball.png"

export interface NeuronInfo {
    name: string;
    type: string;
    coords: Coordinate;
}

export interface OwnProps {
    sceneId: string;
    neurons: Array<NeuronInfo>;
    excitatoryNeuronColor: Color;
    inhibitoryNeuronColor: Color;
    // the color range for excitatory and inhibitory neurons. the neuron colors are adjusted
    // by there weight
    colorRange: ColorRange;
    spikeColor: Color;
    spikeDuration: number;
    // observable that emits network events upon subscription
    networkObservable: Observable<NetworkEvent>;
}


/**
 * Calculates the neuron position array from the neuron information array
 * @param {[NeuronInfo]} neurons An array holding the neuron information objects
 * @param {Float32Array} [neuronPositions] An optional parameter holding the array of neuron positions used by ThreeJs.
 * If this parameter is not specified, or of the size is inconsistent with the array of neurons, then a new
 * Float32Array is created and return, which changes the reference. Otherwise, the same array is used and returned.
 * @return {Float32Array} holding the flatten neuron positions. The length of the array is
 * 3 times the length of the neuron info array
 */
function neuronPositionsFrom(neurons: Array<NeuronInfo>, neuronPositions?: Float32Array): Float32Array {

    function setNeuronPosition(neuronId: number, coords: Coordinate, positions: Float32Array) {
        const [x, y, z] = coords.toArray();
        positions[neuronId * 3] = x;
        positions[neuronId * 3 + 1] = y;
        positions[neuronId * 3 + 2] = z;
    }

    // if the neuron positions were not passed into this function, or if the neuron positions passed into
    // this function has an incompatible size, then create a new array, otherwise, use this one.
    const positions = neuronPositions && neuronPositions.length === neurons.length * 3 ?
        neuronPositions :
        new Float32Array(neurons.length * 3);
    neurons.forEach((info, i) => setNeuronPosition(i, info.coords, positions));
    return positions;
}

/**
 * Creates the color array from the neuron info based on the specified colors for the excitatory and inhibitory
 * neurons. Note that if the optional `neuronColors` array is not passed in, or if its size is not equal to three
 * times the length of the `neurons` array, then a new Float32Array will be created, and a new reference will be
 * returned.
 * @param {Array<NeuronInfo>} neurons An array holding the neuron information objects
 * @param {Color} excitatoryColor The color for excitatory neurons
 * @param {Color} inhibitoryColor The color for inhibitory neurons
 * @param {Float32Array} [neuronColors] An optional parameter holding the array of neuron colors used by ThreeJs.
 * If this parameter is not specified, or of the size is inconsistent with the array of neurons, then a new
 * Float32Array is created and return, which changes the reference. Otherwise, the same array is used and returned.
 * @return {Float32Array} holding the flatten neuron colors (RGB). The length of the array is
 * 3 times the length of the neuron info array
 */
function neuronColorsFrom(neurons: Array<NeuronInfo>,
                          excitatoryColor: Color,
                          inhibitoryColor: Color,
                          neuronColors?: Float32Array): Float32Array {

    function setNeuronColors(neuronId: number, neuronType: string, colors: Float32Array) {
        const color = neuronType === 'e' ? excitatoryColor : inhibitoryColor;
        colors[neuronId * 3] = color.r;
        colors[neuronId * 3 + 1] = color.g;
        colors[neuronId * 3 + 2] = color.b;
    }

    // if the neuron colors were not passed into this function, or if the neuron colors passed into
    // this function has an incompatible size, then create a new array, otherwise, use this one.
    const colors = neuronColors && neuronColors.length === neurons.length * 3 ?
        neuronColors :
        new Float32Array(neurons.length * 3);
    neurons.forEach((info, i) => setNeuronColors(i, info.type, colors));
    return colors;
}

/**
 * @param {string} neuronId The ID of the neuron
 * @param {[NeuronInfo]} neurons The list of neurons
 * @return {number} The index of the neuron with the specified ID
 */
function neuronIndexFrom(neuronId: string, neurons: Array<NeuronInfo>): number {
    return neurons.findIndex(neuron => neuron.name === neuronId);
}

/**
 * @param {NeuronInfo} neuron The neuron
 * @param {ColorRange} colors The colors for excitation and inhibition neurons
 * @return {Color} The current neuron color
 */
function neuronColorFor(neuron: NeuronInfo, colors: ColorRange): Color {
    return neuron?.type === 'e' ? colors.excitatory.max : colors.inhibitory.max;
}

/**
 * @param {number} neuronIndex The index of the neuron for which to update the color
 * @param {Float32Array} neuronColors A float-array holding the r, g, b values. Length of array is
 * three times the length of the neurons array
 * @param {Color} color The current neuron color
 */
function updateNeuronColor(neuronIndex: number, neuronColors: Float32Array, color: Color): void {
    neuronColors[neuronIndex * 3] = color.r;
    neuronColors[neuronIndex * 3 + 1] = color.g;
    neuronColors[neuronIndex * 3 + 2] = color.b;
}

const sprite = new TextureLoader().load( '/resources/ball.png');

/**
 * Visualization of the neurons, as points, with the point colors representing an excitatory or inhibitory
 * neuron.
 * @param {OwnProps} props The neuron visualization properties
 * @return {null} Always null
 * @constructor
 */
function Neurons(props: OwnProps): null {
    const {
        sceneId,
        neurons,
        excitatoryNeuronColor, inhibitoryNeuronColor, colorRange,
        spikeColor, spikeDuration,
        networkObservable
    } = props;

    const neuronPositionsRef = useRef<Float32Array>(neuronPositionsFrom(neurons));
    const neuronColorsRef = useRef<Float32Array>(neuronColorsFrom(neurons, new Color(excitatoryNeuronColor), new Color(inhibitoryNeuronColor)));
    const pointsRef = useRef<Points>();
    const contextRef = useRef<ThreeContext>();
    const renderRef = useRef<() => void>(noop);
    const neuronGeometryRef = useRef(new BufferGeometry());

    // called when the neurons or the color ranges change so that we can recalculate the colors
    useEffect(
        () => {
            neuronPositionsRef.current = neuronPositionsFrom(neurons, neuronPositionsRef.current);

            neuronColorsRef.current = neuronColorsFrom(
                neurons,
                new Color(excitatoryNeuronColor),
                new Color(inhibitoryNeuronColor),
                neuronColorsRef.current
            );
            neuronGeometryRef.current.setAttribute('color', new BufferAttribute(neuronColorsRef.current, 3));
            neuronGeometryRef.current.setDrawRange(0, neurons.length);
            neuronGeometryRef.current.setAttribute('position', new BufferAttribute(neuronPositionsRef.current, 3));

            const pointMaterial = new PointsMaterial({
                vertexColors: true,
                size: 30,
                transparent: true,
                sizeAttenuation: true,
                alphaTest: 0.5,
                map: sprite,
            });

            pointsRef.current = new Points(neuronGeometryRef.current, pointMaterial);
        },
        [neurons, excitatoryNeuronColor, inhibitoryNeuronColor]
    );

    // called when this component is mounted to create the neurons (geometry, material, and mesh) and
    // adds them to the network scene
    useThree<Points>((context: ThreeContext): [scenedId: string, points: Points] => {
        contextRef.current = context;
        return context.scenesContext.addToScene(sceneId, pointsRef.current);
    });

    // called when the component is mounted or the context changes to set the render function needed to animate
    // the neurons' spiking
    useEffect(
        () => {
            renderRef.current = () => threeRender(contextRef.current, noop)
        },
        [contextRef.current]
    );

    /**
     * Animates the neuron spike by changing the neuron's color to the spike-color, and then after the an number
     * of milliseconds specified by the spike-duration, the neuron's color is set back to its original color.
     * When this function is called, sets the neuron to the spiking color, then after a spike-duration (ms) calls
     * itself to set the color back to the neuron's original color.
     * @param {number} neuronIndex The index of the neuron
     * @param {Color} neuronColor The current neuron color (to go back to)
     * @param {boolean} spiking Set to `true` will cause the connection to be displayed with the spike color; set to
     * `false` will cause the connection to be displayed in the original color.
     */
    function animateSpike(neuronIndex: number, neuronColor: Color, spiking: boolean) {
        // update the neuron color based on whether the neuron is spiking or not and let three-js know that
        // the colors need to be updated
        updateNeuronColor(neuronIndex, neuronColorsRef.current, spiking ? spikeColor : neuronColor);
        // (((pointsRef.current).geometry as BufferGeometry).attributes.color as BufferAttribute)!.needsUpdate = true;
        const color = ((pointsRef.current).geometry as BufferGeometry).attributes.color as BufferAttribute;
        if (color !== undefined) {
            color.needsUpdate = true;
        }

        // render the scene with three-js
        renderRef.current();

        // if spiking, then call this function again after a delay to set the neuron's color back to
        // its original value
        if(spiking) {
            setTimeout(
                () => requestAnimationFrame(
                    () => animateSpike(neuronIndex, neuronColor, false)
                ),
                spikeDuration
            );
        }
    }

    useEffect(
        () => {
            const subscription = networkObservable
                .pipe(filter(event => event.type === SPIKE))
                .subscribe({
                    next: event => {
                        if (contextRef.current && pointsRef.current) {
                            const neuronIndex = neuronIndexFrom((event.payload as Spike).neuronId, neurons);
                            const neuronColor = neuronColorFor(neurons[neuronIndex], colorRange);

                            animateSpike(neuronIndex, neuronColor, true);
                        }
                    },
                    error: error => console.error(error),
                    complete: () => console.log("complete")
                });

            return () => {
                subscription.unsubscribe();
            }
        },
        [networkObservable]
    )

    return null;
}

export default Neurons;