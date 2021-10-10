import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {Observable} from "rxjs";
import {NetworkEvent, Spike, SPIKE} from "../redux/actions/networkEvent";
import {useTheme} from "../common/useTheme";
import {filter, map} from "rxjs/operators";
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
    // const [neuronList, setNeuronList] = useState<Array<Series>>(seriesList(neurons))
    const initialDataRef = useRef<Array<Series>>(initialDataFrom(neuronListRef.current))
    // const [chartObservable, setChartObservable] = useState<Observable<ChartData>>(() => convert(networkObservable))
    const chartObservableRef = useRef<Observable<ChartData>>(convert(networkObservable))

    console.log("SpikesChart called")

    useEffect(
        () => {
            chartObservableRef.current = convert(networkObservable)
            // setChartObservable(convert(networkObservable))
        },
        [networkObservable]
    )

    useEffect(
        () => {
            // setNeuronList(seriesList(neurons));
            neuronListRef.current = seriesList(neurons)
        },
        [neurons]
    )

    function initialDataFrom(data: Array<Series>): Array<Series> {
        return data.map(series => seriesFrom(series.name, series.data.slice()))
    }

    function convert(observable: Observable<NetworkEvent>): Observable<ChartData> {
        console.log("converting network-event observable to chart-data observable")
        return observable.pipe(
            filter(event => event.type === SPIKE),
            map(event => event.payload as Spike),
            map(spike => {
                console.log(spike)
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
            seriesObservable={chartObservableRef.current}
            shouldSubscribe={shouldSubscribe}
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
    // return (
    //     <RasterChart
    //         height={height}
    //         width={width}
    //         seriesList={neuronList}
    //         seriesObservable={chartObservable}
    //         shouldSubscribe={shouldSubscribe}
    //         // onSubscribe={subscription => subscriptionRef.current = subscription}
    //         // timeWindow={timeWindow}
    //         timeWindow={5000}
    //         windowingTime={100}
    //         // dropDataAfter={dropDataAfter}
    //         dropDataAfter={5000}
    //         margin={{top: 15, right: 20, bottom: 35, left: 40}}
    //         // margin={{top: 0, right: 0, bottom: 0, left: 0}}
    //         tooltip={{
    //             // visible: selectedControl === Control.TOOLTIP,
    //             visible: true,
    //             backgroundColor: itheme.palette.themeLighterAlt,
    //             fontColor: itheme.palette.themePrimary,
    //             borderColor: itheme.palette.themePrimary,
    //         }}
    //         magnifier={{
    //             // visible: selectedControl === Control.MAGNIFIER,
    //             visible: false,
    //             magnification: 5,
    //             color: itheme.palette.neutralTertiaryAlt,
    //         }}
    //         tracker={{
    //             // visible: selectedControl === Control.TRACKER,
    //             visible: false,
    //             color: itheme.palette.themePrimary,
    //         }}
    //         // filter={seriesFilter}
    //         filter={new RegExp('')}
    //         backgroundColor={itheme.palette.white}
    //         svgStyle={{width: '95%'}}
    //         axisStyle={{color: itheme.palette.themePrimary}}
    //         axisLabelFont={{color: itheme.palette.themePrimary}}
    //         plotGridLines={{color: itheme.palette.themeLighter}}
    //         spikesStyle={{
    //             color: itheme.palette.themePrimary,
    //             highlightColor: itheme.palette.themePrimary
    //         }}
    //     />
    // )
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
