import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {
    AxisLocation,
    Chart,
    ChartData,
    ContinuousAxis,
    Datum,
    formatNumber,
    ScatterPlot,
    ScatterPlotTooltipContent,
    Series,
    seriesFrom,
    Tooltip,
    Tracker,
    TrackerLabelLocation
} from "stream-charts";
import {Observable} from "rxjs";
import {CONNECTION_WEIGHT, ConnectionWeight, NetworkEvent} from "../redux/actions/networkEvent";
import {useTheme} from "../common/useTheme";
import {filter, map} from "rxjs/operators";
import {HashMap, Option} from "prelude-ts";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {AppState} from "../redux/reducers/root";
import {connect} from "react-redux";
import {ConnectionInfo} from "../visualization/neuralthree/Connections";
import {useGridCell} from "react-resizable-grid-layout";

interface OwnProps {
    width?: number
    height?: number
    networkObservable: Observable<NetworkEvent>
    shouldSubscribe: boolean
}

interface StateProps {
    networkId: Option<string>
    // neurons: HashMap<string, NeuronInfo>
    connections: HashMap<string, ConnectionInfo>
}

type Props = StateProps & OwnProps

function WeightsChart(props: Props): JSX.Element {
    const {
        networkObservable,
        shouldSubscribe,
        connections,
    } = props
    const {itheme} = useTheme()
    const {width, height} = useGridCell()

    const connectionListRef = useRef<Array<Series>>(seriesList(connections))
    const initialDataRef = useRef<Array<Series>>(initialDataFrom(connectionListRef.current))
    const [chartObservable, setChartObservable] = useState<Observable<ChartData>>(() => convert(networkObservable))
    // const [connectionList, setConnectionList] = useState<Array<Series>>(seriesList(connections))
    // when the shouldSubscribe property changes to true, the chart subscribes to the
    // chart observable before it really exists. the running flag lets the chart know the
    // the observable has been converted, and that we are now in the running state...
    const [running, setRunning] = useState(false)

    useEffect(
        () => {
            setChartObservable(convert(networkObservable))
            // we don't want the <Chart/> to subscribe to the observable before it is
            // converted, so we set the "running" to true once the observable has been
            // converted and we're ready to run
            if (shouldSubscribe) setRunning(true)
            return () => setRunning(false)
        },
        [networkObservable, shouldSubscribe]
    )

    useEffect(
        () => {
            // setConnectionList(seriesList(connections));
            connectionListRef.current = seriesList(connections)
        },
        [connections]
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
            filter(event => event.type === CONNECTION_WEIGHT),
            map(event => event.payload as ConnectionWeight),
            map(weight => ({
                maxTime: weight.signalTime.value,
                maxTimes: new Map<string, number>(
                    [[weight.neuronId, weight.signalTime.value]]
                ),
                newPoints: new Map<string, Array<Datum>>(
                    [[
                        `${weight.sourceId}-${weight.neuronId}`,
                        [{time: weight.signalTime.value, value: weight.newWeight} as Datum]]
                    ]
                )
            }))
        )
    }

    /**
     * Converts the map of neuron information into an array of {@link Series}
     * @param {HashMap<string, NeuronInfo>} neurons A map holding the neuron ID to its association information
     * @return {Array<Series>} The array of {@link Series} holding the neuron ID and empty data.
     */
    function seriesList(neurons: HashMap<string, ConnectionInfo>): Array<Series> {
        return neurons
            .toVector()
            .map(([, info]) => seriesFrom(`${info.preSynaptic.name}-${info.postSynaptic.name}`))
            .toArray()
    }

    return (
        <Chart
            width={width}
            height={height}
            margin={{top: 35, right: 60, bottom: 35, left: 60}}
            color={itheme.palette.themePrimary}
            backgroundColor={itheme.palette.white}
            initialData={initialDataRef.current}
            seriesFilter={new RegExp('')}
            seriesObservable={chartObservable}
            shouldSubscribe={shouldSubscribe && running}
            windowingTime={125}
        >
            <ContinuousAxis
                axisId="x-axis-1"
                location={AxisLocation.Bottom}
                domain={[0, 10000]}
                label="t (ms)"
                // font={{color: theme.color}}
            />
            <ContinuousAxis
                axisId="y-axis-1"
                location={AxisLocation.Left}
                label="weight"
                domain={[0, 1]}
            />
            <ContinuousAxis
                axisId="y-axis-2"
                location={AxisLocation.Right}
                label="weight"
                domain={[0, 1]}
            />
            <Tracker
                visible={false}
                labelLocation={TrackerLabelLocation.WithMouse}
                style={{color: itheme.palette.themePrimary}}
                font={{color: itheme.palette.themePrimary}}
                // onTrackerUpdate={update => console.dir(update)}
            />
            <Tooltip
                visible={true}
                style={{
                    fontColor: itheme.palette.themePrimary,
                    backgroundColor: itheme.palette.white,
                    borderColor: itheme.palette.themePrimary,
                    backgroundOpacity: 0.9,
                }}
            >
                <ScatterPlotTooltipContent
                    xLabel="t (ms)"
                    yLabel="weight"
                    yValueFormatter={value => formatNumber(value, " ,.0f")}
                    yChangeFormatter={value => formatNumber(value, " ,.0f")}
                />
            </Tooltip>
            <ScatterPlot
                axisAssignments={new Map()}
                dropDataAfter={10000}
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
    // neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,
});

export default connect(mapStateToProps, {})(WeightsChart)
