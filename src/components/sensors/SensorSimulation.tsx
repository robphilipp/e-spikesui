import * as React from 'react';
import {FormEvent, useEffect, useState} from 'react';
import {Observable, Subscription} from "rxjs";
import {ChartData, regexFilter, Series, seriesFrom, RasterChart} from "stream-charts";
import {Checkbox, ITheme, Stack, TextField} from "@fluentui/react";

const emptyFunction = () => {return;};

enum Control {
    TRACKER = 'tracker',
    TOOLTIP = 'tooltip',
    MAGNIFIER = 'magnifier'
}

interface Props {
    neuronIds: Array<string>;
    observable: Observable<ChartData>;
    shouldSubscribe: boolean;
    onSubscribe?: (subscription: Subscription) => void;

    itheme: ITheme;
    width?: number;
    heightPerNeuron?: number;
}

export default function SensorSimulation(props: Props): JSX.Element {
    const {
        neuronIds,
        observable,
        shouldSubscribe,
        itheme,
        heightPerNeuron = 25,
        onSubscribe = emptyFunction
    } = props;

    const [neuronList, setNeuronList] = useState<Array<Series>>(seriesList(neuronIds));
    const [selectedControl, setSelectedControl] = useState<string>('');
    const [filterValue, setFilterValue] = useState<string>('');
    const [seriesFilter, setSeriesFilter] = useState<RegExp>(new RegExp(''));

    // update the series list of the neuron info changes
    useEffect(
        () => {
            setNeuronList(seriesList(neuronIds));
        },
        [neuronIds, observable]
    )

    /**
     * Converts the map of neuron information into an array of {@link Series}
     * @param neurons An array holding the neuron IDs
     * @return The array of {@link Series} holding the neuron ID and empty data.
     */
    function seriesList(neurons: Array<string>): Array<Series> {
        return neurons.map(neuronId => seriesFrom(neuronId));
    }

    /**
     * Updates the selected control, ensuring that at most one control (i.e. tracker, tooltip, magnifier) is
     * selected at once
     * @param {Control} name The name of the control
     * @param {boolean} checked `true` if the control has been selected; `false` if the control has been
     * unselected
     */
    function handleControlSelection(name: Control, checked: boolean): void {
        if(checked) {
            setSelectedControl(name);
        }
        else if(selectedControl === name) {
            setSelectedControl('');
        }
    }

    /**
     * Called when the user changes the regular expression filter
     * @param {string} updatedFilter The updated the filter
     */
    function handleUpdateRegex(updatedFilter: string): void {
        setFilterValue(updatedFilter);
        regexFilter(updatedFilter).ifSome((regex: RegExp) => setSeriesFilter(regex));
    }

    if(neuronList.length === 0) {
        return <div/>;
    }
    return (
        <Stack tokens={{childrenGap: 20}}>
            <Stack horizontal tokens={{childrenGap: 20}}>
                <div style={{paddingTop: 7}}>
                    <Checkbox
                        label="Tracker"
                        checked={selectedControl === Control.TRACKER}
                        onChange={(_: FormEvent<HTMLInputElement>, checked: boolean) => handleControlSelection(Control.TRACKER, checked)}
                    />
                </div>
                <div style={{paddingTop: 7}}>
                    <Checkbox
                        label="Tooltip"
                        checked={selectedControl === Control.TOOLTIP}
                        onChange={(_: FormEvent<HTMLInputElement>, checked: boolean) => handleControlSelection(Control.TOOLTIP, checked)}
                    />
                </div>
                <div style={{paddingTop: 7}}>
                    <Checkbox
                        label="Magnifier"
                        checked={selectedControl === Control.MAGNIFIER}
                        onChange={(_: FormEvent<HTMLInputElement>, checked: boolean) => handleControlSelection(Control.MAGNIFIER, checked)}
                    />
                </div>
                <TextField
                    prefix="Filter"
                    suffix="RegEx"
                    value={filterValue}
                    onChange={(_: FormEvent<HTMLInputElement>, value: string) => handleUpdateRegex(value)}
                />
            </Stack>
            <Stack.Item>
                <RasterChart
                    height={neuronList.length * heightPerNeuron + 60}
                    seriesList={neuronList}
                    seriesObservable={observable}
                    shouldSubscribe={shouldSubscribe}
                    onSubscribe={subscription => onSubscribe(subscription)}
                    timeWindow={5000}
                    windowingTime={100}
                    margin={{top: 30, right: 20, bottom: 30, left: 75}}
                    tooltip={{visible: selectedControl === Control.TOOLTIP}}
                    magnifier={{visible: selectedControl === Control.MAGNIFIER, magnification: 5}}
                    tracker={{visible: selectedControl === Control.TRACKER}}
                    filter={seriesFilter}
                    backgroundColor={itheme.palette.white}
                    svgStyle={{width: '95%'}}
                />
            </Stack.Item>
        </Stack>
    );
}