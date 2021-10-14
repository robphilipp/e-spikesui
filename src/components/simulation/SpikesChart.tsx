import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {Observable} from "rxjs";
import {NetworkEvent, Spike, SPIKE} from "../redux/actions/networkEvent";
import {useTheme} from "../common/useTheme";
import {filter, map, tap} from "rxjs/operators";
import {HashMap, Option} from "prelude-ts";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {AppState} from "../redux/reducers/root";
import {connect} from "react-redux";
import {useGridCell} from "react-resizable-grid-layout";
import {AxisLocation, CategoryAxis, Chart, ChartData, ContinuousAxis, Datum, RasterPlot, Series, seriesFrom} from 'stream-charts';

interface OwnProps {
    width?: number
    height?: number
    networkObservable: Observable<NetworkEvent>
    shouldSubscribe: boolean
}

interface StateProps {
    networkId: Option<string>
    neurons: HashMap<string, NeuronInfo>
    // connections: HashMap<string, ConnectionInfo>
}

type Props = StateProps & OwnProps

function SpikesChart(props: Props): JSX.Element {
    const {
        networkObservable,
        shouldSubscribe,
        neurons,
    } = props
    const {itheme} = useTheme()
    const {width, height} = useGridCell()

    const neuronListRef = useRef<Array<Series>>(seriesList(neurons))
    const initialDataRef = useRef<Array<Series>>(initialDataFrom(neuronListRef.current))
    const [chartObservable, setChartObservable] = useState<Observable<ChartData>>()
    // when the shouldSubscribe property changes to true, the chart subscribes to the
    // chart observable before it really exists. the running flag lets the chart know the
    // the observable has been converted, and that we are now in the running state...
    const [running, setRunning] = useState(false)

    console.log("SpikesChart called")

    useEffect(
        () => {
            setChartObservable(convert(networkObservable))
            // we don't want the <Chart/> to subscribe to the observable before it is
            // converted, so we set the "running" to true once the observable has been
            // converted and we're ready to run
            if (shouldSubscribe) setRunning(true)
        },
        [networkObservable, shouldSubscribe]
    )

    useEffect(
        () => {
            neuronListRef.current = seriesList(neurons)
        },
        [neurons]
    )

    /**
     * Creates the initial data from the series
     * @param data The series list
     * @return an array of series that are the initial data
     */
    function initialDataFrom(data: Array<Series>): Array<Series> {
        return data.map(series => seriesFrom(series.name, series.data.slice()))
    }

    /**
     * Converts the network-event observable into a chart-data observable, only passing
     * through network-events that are spikes.
     * @param observable The network event observable
     * @return A observable of chart-data
     */
    function convert(observable: Observable<NetworkEvent>): Observable<ChartData> {
        return observable.pipe(
            // tap(event => console.log("spike", event)),
            filter(event => event.type === SPIKE),
            map(event => event.payload as Spike),
            map(spike => {
                return {
                    maxTime: spike.timestamp.value,
                    maxTimes: new Map<string, number>(
                        [[spike.neuronId, spike.timestamp.value]]
                    ),
                    newPoints: new Map<string, Array<Datum>>(
                        [[spike.neuronId, [{time: spike.timestamp.value, value: spike.signalIntensity.value} as Datum]]]
                    )
                }
            })
        )
    }

    /**
     * Converts the map of neuron information into an array of {@link Series}
     * @param {HashMap<string, NeuronInfo>} neurons A map holding the neuron ID to its association information
     * @return {Array<Series>} The array of {@link Series} holding the neuron ID and empty data.
     */
    function seriesList(neurons: HashMap<string, NeuronInfo>): Array<Series> {
        return neurons
            .toVector()
            .map(([, info]) => seriesFrom(info.name))
            .toArray()
    }

    return (
        <Chart
            width={width}
            height={height}
            margin={{top: 15, right: 60, bottom: 35, left: 60}}
            color={itheme.palette.themePrimary}
            backgroundColor={itheme.palette.white}
            initialData={initialDataRef.current}
            seriesFilter={new RegExp('')}
            seriesObservable={chartObservable}
            shouldSubscribe={shouldSubscribe && running}
            windowingTime={75}
        >
            <ContinuousAxis
                axisId="x-axis-1"
                location={AxisLocation.Bottom}
                domain={[0, 5000]}
                label="t (ms)"
                // font={{color: theme.color}}
            />
            <CategoryAxis
                axisId="y-axis-1"
                location={AxisLocation.Left}
                categories={initialDataRef.current.map(series => series.name)}
                label="neuron"
            />
            <CategoryAxis
                axisId="y-axis-2"
                location={AxisLocation.Right}
                categories={initialDataRef.current.map(series => series.name)}
                label="neuron"
            />
            <RasterPlot
                axisAssignments={new Map()}
                spikeMargin={1}
                dropDataAfter={5000}
                panEnabled={true}
                zoomEnabled={true}
            />
        </Chart>
    )
}


/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions/networkEvents.ts for the action types)
 |
 */

/**
 * react-redux function that maps the network-events slice of the application state to the components state-props.
 * @param {AppState} state The application state from the redux root store
 * @return {StateProps} The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState): StateProps => ({
    networkId: state.networkManagement.networkId,
    neurons: state.networkEvent.neurons,
    // connections: state.networkEvent.connections,
});

export default connect(mapStateToProps, {})(SpikesChart)
