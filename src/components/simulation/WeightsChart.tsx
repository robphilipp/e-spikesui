import * as React from 'react'
import {useEffect, useState} from 'react'
// import {ChartData, Datum, RasterChart, Series, seriesFrom} from "stream-charts";
import {Datum, Series, seriesFrom} from "../charts/datumSeries";
import {ChartData} from "../charts/chartData";
import {Observable} from "rxjs";
import {CONNECTION_WEIGHT, ConnectionWeight, NetworkEvent} from "../redux/actions/networkEvent";
import {useTheme} from "../common/useTheme";
import {filter, map} from "rxjs/operators";
import {HashMap, Option} from "prelude-ts";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {AppState} from "../redux/reducers/root";
import {connect} from "react-redux";
import {ConnectionInfo} from "../visualization/neuralthree/Connections";
import {ScatterChart} from '../charts/ScatterChart';
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

    const [chartObservable, setChartObservable] = useState<Observable<ChartData>>(convert(networkObservable))
    const [connectionList, setConnectionList] = useState<Array<Series>>(seriesList(connections))

    useEffect(
        () => {
            setChartObservable(convert(networkObservable))
        },
        [networkObservable]
    )

    useEffect(
        () => {
            setConnectionList(seriesList(connections));
        },
        [connections]
    )

    function convert(observable: Observable<NetworkEvent>): Observable<ChartData> {
        return observable.pipe(
            filter(event => event.type === CONNECTION_WEIGHT),
            map(event => event.payload as ConnectionWeight),
            map(weight => ({
                maxTime: weight.signalTime.value,
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
        <ScatterChart
            height={height}
            width={width}
            seriesList={connectionList}
            seriesObservable={chartObservable}
            shouldSubscribe={shouldSubscribe}
            // onSubscribe={subscription => subscriptionRef.current = subscription}
            onSubscribe={subscription => console.log("weights chart subscribed to learn subject")}
            // timeWindow={timeWindow}
            timeWindow={5000}
            windowingTime={100}
            // dropDataAfter={dropDataAfter}
            dropDataAfter={5000}
            margin={{top: 15, right: 20, bottom: 35, left: 40}}
            // margin={{top: 0, right: 0, bottom: 0, left: 0}}
            tooltip={{
                // visible: selectedControl === Control.TOOLTIP,
                visible: true,
                backgroundColor: itheme.palette.themeLighterAlt,
                fontColor: itheme.palette.themePrimary,
                borderColor: itheme.palette.themePrimary,
            }}
            magnifier={{
                // visible: selectedControl === Control.MAGNIFIER,
                visible: false,
                magnification: 5,
                color: itheme.palette.neutralTertiaryAlt,
            }}
            tracker={{
                // visible: selectedControl === Control.TRACKER,
                visible: false,
                color: itheme.palette.themePrimary,
            }}
            // filter={seriesFilter}
            filter={new RegExp('')}
            backgroundColor={itheme.palette.white}
            svgStyle={{width: '95%'}}
            axisStyle={{color: itheme.palette.themePrimary}}
            axisLabelFont={{color: itheme.palette.themePrimary}}
            plotGridLines={{color: itheme.palette.themeLighter}}
            minY={0}
        />
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
