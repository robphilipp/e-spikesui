import * as React from 'react';
import {FormEvent, useCallback, useEffect, useRef, useState} from 'react';
import {Observable, Subscription} from "rxjs";
import {Checkbox, IconButton, ITheme, MessageBar, MessageBarType, TextField, TooltipHost, Text} from "@fluentui/react";
import {SensorOutput} from "./compiler";
import moment from "moment";
import {map} from "rxjs/operators";
import {ExpressionState} from '../editors/SensorsEditor';
import {newSensorThread, SensorThread} from "../threads/SensorThread";
import {
    Grid,
    gridArea,
    GridItem,
    gridTemplateAreasBuilder,
    gridTrackTemplateBuilder,
    useGridCell,
    withFraction,
    withPixels
} from 'react-resizable-grid-layout';
import {JSX} from "@babel/types";
import {
    AxisLocation,
    CategoryAxis,
    Chart,
    ChartData,
    ContinuousAxis,
    Datum,
    formatNumber,
    RasterPlot,
    RasterPlotTooltipContent,
    regexFilter,
    Series,
    seriesFrom,
    Tooltip,
    Tracker,
    TrackerLabelLocation
} from "stream-charts";

enum Control {
    TRACKER = 'tracker',
    TOOLTIP = 'tooltip',
    MAGNIFIER = 'magnifier'
}

interface Props {
    codeSnippet: string;
    timeFactor: number;

    onClose?: () => void;

    itheme: ITheme;
    width?: number;
}

/**
 * Control panel for compiling and running the sensor simulation
 * @param props The properties from the parent and redux
 * @return The control panel for the sensor simulation
 * @constructor
 */
export default function SensorSimulation(props: Props): JSX.Element {
    const {
        codeSnippet,
        timeFactor,
        onClose,
        itheme,
    } = props;

    const [neuronList, setNeuronList] = useState<Array<Series>>([]);
    const initialDataRef = useRef<Array<Series>>([])
    const [selectedControl, setSelectedControl] = useState<string>('');
    const [filterValue, setFilterValue] = useState<string>('');
    const [seriesFilter, setSeriesFilter] = useState<RegExp>(new RegExp(''));
    const [dropDataAfter, setDropDataAfter] = useState<number>(5000);
    const [timeWindow, setTimeWindow] = useState<number>(5000);

    // manages the state of the code snippet (i.e. pre-compiled, compiled, running), and the
    // compile-time errors
    const [expressionState, setExpressionState] = useState<ExpressionState>(ExpressionState.PRE_COMPILED);
    const [expressionError, setExpressionError] = useState<string>();
    // a reference to the observable generated by compiling and executing the sensor description
    const [sensorObservable, setSensorObservable] = useState<Observable<SensorOutput>>();
    const [chartObservable, setChartObservable] = useState<Observable<ChartData>>();
    // a reference to the subscription to the observable used for testing
    const subscriptionRef = useRef<Subscription>();

    // sensor thread
    const sensorThreadRef = useRef<SensorThread>();

    // creates the new sensor simulation thread that runs the javascript code snippet
    useEffect(
        () => {
            console.log("mounted sensor simulation ")
            return () => {
                console.log("unmounted sensor simulation")
                // terminate sensor-simulation worker thread on dismount, in case it is
                // still hanging around
                sensorThreadRef.current.terminate()
                    .catch(reason => console.error(`Failed to terminate worker thread; ${reason}`));
            }
        },
        []
    )

    // the keyboard event listener holds a stale ref to the props, so we need to update
    // the referenced values when they change. Also when the code snippet changes, then
    // we need to set the observableRef back to an undefined
    useEffect(
        () => {
            setSensorObservable(undefined);
            setExpressionState(ExpressionState.PRE_COMPILED);
        },
        [codeSnippet]
    );

    /**
     * Converts the map of neuron information into an array of {@link Series}
     * @param neurons An array holding the neuron IDs
     * @return The array of {@link Series} holding the neuron ID and empty data.
     */
    function seriesList(neurons: Array<string>): Array<Series> {
        return neurons.map(neuronId => seriesFrom(neuronId, []));
    }

    function initialDataFrom(data: Array<Series>): Array<Series> {
        return data.map(series => seriesFrom(series.name, series.data.slice()))
    }

    /**
     * Updates the selected control, ensuring that at most one control (i.e. tracker, tooltip, magnifier) is
     * selected at once
     * @param {Control} name The name of the control
     * @param {boolean} checked `true` if the control has been selected; `false` if the control has been
     * unselected
     */
    function handleControlSelection(name: Control, checked: boolean): void {
        if (checked) {
            setSelectedControl(name);
        } else if (selectedControl === name) {
            setSelectedControl('');
        }
    }

    /**
     * Updates the control selection to add/remove the tracker
     * @param event The event
     * @param checked `true` if the tracker was selected; `false` otherwise
     */
    function handleTrackerSelection(event: FormEvent<HTMLInputElement>, checked: boolean): void {
        handleControlSelection(Control.TRACKER, checked);
    }

    /**
     * Updates the control selection to add/remove the tooltip
     * @param event The event
     * @param checked `true` if the tooltip was selected; `false` otherwise
     */
    function handleTooltipSelection(event: FormEvent<HTMLInputElement>, checked: boolean): void {
        handleControlSelection(Control.TOOLTIP, checked);
    }

    /**
     * Updates the control selection to add/remove the magnifier
     * @param event The event
     * @param checked `true` if the magnifier was selected; `false` otherwise
     */
    function handleMagnifierSelection(event: FormEvent<HTMLInputElement>, checked: boolean): void {
        handleControlSelection(Control.MAGNIFIER, checked);
    }

    /**
     * Called when the user changes the regular expression filter
     * @param {string} updatedFilter The updated the filter
     */
    function handleUpdateRegex(updatedFilter: string): void {
        setFilterValue(updatedFilter);
        regexFilter(updatedFilter).ifSome((regex: RegExp) => setSeriesFilter(regex));
    }

    /**
     * Handles updating the time after which data is dropped
     * @param time The time, in milliseconds, after which data is dropped
     */
    function handleUpdateDropDataAfter(time: string): void {
        if (time.match(/^[1-9]([0-9]*)$/) !== null) {
            setDropDataAfter(parseInt(time, 10));
        }
    }

    /**
     * Handles updating the time-window of the plot (i.e. the time-range of data shown when
     * streaming by)
     * @param time The width of the time-window in milliseconds
     */
    function handleUpdateTimeWindow(time: string): void {
        if (time.match(/^[1-9]([0-9]*)$/) !== null) {
            setTimeWindow(parseInt(time, 10));
        }
    }

    /**
     * Handles compiling and evaluating the sensor description code-snippet. The compiled code snippet
     * is for simulating the sensor code so that it can be tested.
     * @return An empty promise
     */
    async function handleCompile(): Promise<void> {
        try {
            // create a sensor-simulation worker for compiling and running the sensor
            sensorThreadRef.current = await newSensorThread();

            // attempt to compile the code-snippet as a simulator
            const generator = await sensorThreadRef.current.compileSimulator(codeSnippet, timeFactor);

            // when successfully compiled, then set up the simulation
            const neurons = seriesList(generator.neuronIds)
            setNeuronList(neurons);
            initialDataRef.current = initialDataFrom(neurons)
            setSensorObservable(generator.observable);
            setExpressionState(ExpressionState.COMPILED);
            setExpressionError(undefined);
        } catch (error) {
            // unable to compile code snippet
            setExpressionState(ExpressionState.PRE_COMPILED);
            setExpressionError(error.message);
        }
    }

    /**
     * Handles running the simulation by subscribing to the observable generated from compiling the
     * sensor code snippet.
     */
    function handleRunSensorSimulation(): void {
        if (expressionState === ExpressionState.COMPILED) {
            const now = moment().valueOf();
            const observable = sensorObservable.pipe(
                map(output => {
                    const time = Math.ceil((output.time - now) / timeFactor);
                    return {
                        maxTime: time,
                        maxTimes: new Map<string, number>(
                            output.neuronIds.map(id => [id, time])
                        ),
                        newPoints: new Map<string, Array<Datum>>(
                            output.neuronIds.map(id => [id, [{time: time, value: output.signal.value}]])
                        )
                    } as ChartData
                })
            );
            setChartObservable(observable);
            setExpressionState(ExpressionState.RUNNING);
        }
    }

    /**
     * Handles stopping the sensor simulation, but keeps the simulation window open
     */
    function handleStopSensorSimulation(): void {
        subscriptionRef.current?.unsubscribe();
        // only want to set the expression state to compiled if it is running. it is possible
        // that the simulation has been stopped (expression state is compiled), and then edited
        // while the simulation window is open, and in that case, we want to leave the expression
        // state as pre-compiled
        if (expressionState === ExpressionState.RUNNING) {
            sensorThreadRef.current.stop()
                .then(() => sensorThreadRef.current.terminate())
                .catch(reason => console.error(`Failed to stop or terminate worker thread; ${reason}`))

            setSensorObservable(undefined)
            // setExpressionState(ExpressionState.PRE_COMPILED);
            setExpressionState(ExpressionState.STOPPED)
        }
    }

    /**
     * Handles closing the sensor simulation panel and stops the simulation if it is running
     */
    function handleCloseSimulation(): void {
        handleStopSensorSimulation();
        if (onClose) onClose();
    }

    /**
     * Creates a compile button used to compile the sensor description
     * @return The button for compiling the sensor description
     */
    function compileButton(): JSX.Element {
        return <>
            <TooltipHost content="Compile the sensor code">
                <IconButton
                    iconProps={{iconName: 'code'}}
                    disabled={
                        (codeSnippet !== undefined && codeSnippet.length < 31) ||
                        sensorObservable !== undefined ||
                        expressionState === ExpressionState.RUNNING ||
                        expressionState === ExpressionState.COMPILED
                    }
                    onClick={handleCompile}
                />
            </TooltipHost>
        </>
    }

    /**
     * Creates an evaluate button used to evaluate the sensor description
     * @return The button for evaluating the sensor description
     */
    function runSensorSimulationButton(): JSX.Element {
        return <>
            <TooltipHost content="Run simulation of the sensor code">
                <IconButton
                    iconProps={{iconName: 'play'}}
                    disabled={
                        expressionState === ExpressionState.PRE_COMPILED ||
                        expressionState === ExpressionState.RUNNING ||
                        expressionState === ExpressionState.STOPPED ||
                        // expressionError !== undefined ||
                        sensorObservable === undefined
                    }
                    onClick={handleRunSensorSimulation}
                />
            </TooltipHost>
        </>
    }

    /**
     * Creates a stop button used to stop the evaluation of the sensor description code
     * @return The button for stopping the evaluation of the sensor description code
     */
    function stopSensorSimulationButton(): JSX.Element {
        return <>
            <TooltipHost content="Stop the sensor code simulation">
                <IconButton
                    iconProps={{iconName: 'stop'}}
                    disabled={expressionState !== ExpressionState.RUNNING}
                    onClick={handleStopSensorSimulation}
                />
            </TooltipHost>
        </>
    }

    const onSubscribe = useCallback(
        (subscription: Subscription) => subscriptionRef.current = subscription,
        []
    )

    /**
     * Component that wraps the Raster chart to avoid the react conditional-hook error. In this
     * case the hook is called each time, but only used when the neuron list is not empty
     * @constructor
     */
    function RastaRapper(): JSX.Element {
        const {width, height} = useGridCell()
        if (neuronList?.length > 0) {
            console.log("Sensor Simulation: RastaRapper; expressionState", expressionState, "onSubscribe", onSubscribe, "neuronList", neuronList)
            return (
                <Chart
                    width={width}
                    height={height}
                    margin={{top: 15, right: 60, bottom: 35, left: 60}}
                    color={itheme.palette.themePrimary}
                    backgroundColor={itheme.palette.white}
                    initialData={initialDataRef.current}
                    seriesFilter={seriesFilter}
                    seriesObservable={chartObservable}
                    shouldSubscribe={expressionState === ExpressionState.RUNNING}
                    onSubscribe={onSubscribe}
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
                    <Tracker
                        visible={selectedControl === Control.TRACKER}
                        labelLocation={TrackerLabelLocation.WithMouse}
                        style={{color: itheme.palette.themePrimary}}
                        font={{color: itheme.palette.themePrimary}}
                        // onTrackerUpdate={update => console.dir(update)}
                    />
                    <Tooltip
                        visible={selectedControl === Control.TOOLTIP}
                        style={{
                            fontColor: itheme.palette.themePrimary,
                            backgroundColor: itheme.palette.white,
                            borderColor: itheme.palette.themePrimary,
                            backgroundOpacity: 0.9,
                        }}
                    >
                        <RasterPlotTooltipContent
                            xFormatter={value => formatNumber(value, " ,.0f") + ' ms'}
                            yFormatter={value => formatNumber(value, " ,.1f") + ' mV'}
                        />
                    </Tooltip>
                    <RasterPlot
                        // axisAssignments={new Map()}
                        spikeMargin={2}
                        dropDataAfter={dropDataAfter}
                        panEnabled={true}
                        zoomEnabled={true}
                        zoomKeyModifiersRequired={false}
                    />
                </Chart>
            )
        }
        return <div/>
    }

    return (
        <Grid
            dimensionsSupplier={useGridCell}
            gridTemplateColumns={gridTrackTemplateBuilder().addTrack(withFraction(1)).build()}
            gridTemplateRows={gridTrackTemplateBuilder()
                .addTrack(withPixels(35))
                .addTrack(withPixels(35))
                .addTrack(withFraction(1))
                .addTrack(withPixels(35))
                .build()
            }
            gridTemplateAreas={gridTemplateAreasBuilder()
                .addArea('sensorDataControls', gridArea(1, 1))
                .addArea('sensorSimulationControls', gridArea(2, 1))
                .addArea('sensorSimulationChart', gridArea(3, 1))
                .addArea('sensorSimulationChartControls', gridArea(4, 1))
                .build()
            }
        >
            <GridItem gridAreaName='sensorDataControls'>
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignContent: 'center',
                    columnGap: 5,
                }}>
                    <TextField
                        size={8}
                        prefix="Drop Data After"
                        suffix="ms"
                        value={dropDataAfter.toString()}
                        onChange={(_, value: string) => handleUpdateDropDataAfter(value)}
                    />
                    <TextField
                        size={8}
                        prefix="Time Window"
                        suffix="ms"
                        value={timeWindow.toString()}
                        onChange={(_, value: string) => handleUpdateTimeWindow(value)}
                    />
                    <TextField
                        prefix="Filter"
                        suffix="RegEx"
                        value={filterValue}
                        onChange={(_: FormEvent<HTMLInputElement>, value: string) => handleUpdateRegex(value)}
                    />
                    <div style={{display: 'flex', justifyContent: 'flex-end', flexGrow: 1}}>
                        <TooltipHost content="Hide the sensor simulation">
                            <IconButton
                                iconProps={{iconName: 'close'}}
                                onClick={handleCloseSimulation}
                            />
                        </TooltipHost>
                    </div>
                </div>
            </GridItem>
            <GridItem gridAreaName='sensorSimulationControls'>
                <div>
                    {compileButton()}
                    {runSensorSimulationButton()}
                    {stopSensorSimulationButton()}
                    {neuronList?.length === 0 || expressionState === ExpressionState.PRE_COMPILED || expressionState === ExpressionState.STOPPED ?
                        <Text style={{marginLeft: 10}}>
                            Please compile sensor description.
                        </Text> :
                        <div/>
                    }
                    {expressionError ?
                        <MessageBar messageBarType={MessageBarType.error}>
                            Error: {expressionError}
                        </MessageBar> :
                        <div/>
                    }
                </div>
            </GridItem>
            <GridItem gridAreaName='sensorSimulationChart'>
                {expressionState === ExpressionState.COMPILED || expressionState === ExpressionState.RUNNING || expressionState === ExpressionState.STOPPED ?  RastaRapper(): <div/>}
            </GridItem>
            <GridItem gridAreaName='sensorSimulationChartControls'>
                {neuronList?.length > 0 ?
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignContent: 'center',
                        columnGap: 5,
                    }}>
                        <Checkbox
                            label="Tracker"
                            checked={selectedControl === Control.TRACKER}
                            onChange={handleTrackerSelection}
                        />
                        <Checkbox
                            label="Tooltip"
                            checked={selectedControl === Control.TOOLTIP}
                            onChange={handleTooltipSelection}
                        />
                    </div> :
                    <div/>
                }
            </GridItem>
        </Grid>
    );
}
