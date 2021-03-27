import {useEffect, useRef, useState} from 'react';
import moment from "moment";

interface SimulationTimer {
    // the current simulation time in seconds
    simulationTime: number;
    // the remaining time in seconds
    remainingTime: number;
    // the function for starting the timer
    startTimer: (simulationDuration: number, timeFactor: number) => void;
    // the function for cancelling the timer
    cancelTimer: () => void;
}

/**
 * Hook for a simulation timer
 * @param handleStop Function that is called when the timer runs out
 * @param updateIntervalMs (Optional) The number of milliseconds between updates of the clock (in simulation time)
 * @return The simulation timer
 */
export default function useSimulationTimer(handleStop: () => void, updateIntervalMs = 1000): SimulationTimer {
    const simulationStartRef = useRef<number>();
    const simulationTimeTickerRef = useRef<NodeJS.Timeout>();
    const simulationEndTimerRef = useRef<NodeJS.Timeout>();
    const remainingTimeRef = useRef<number>(0);
    const [simulationTime, setSimulationTime] = useState<number>();

    /**
     * Starts the timer, updating the simulation time periodically
     * @param simulationDuration The duration of the simulation in seconds
     * @param timeFactor The number of real-time seconds it takes for one simulation second to pass. This number
     * must be greater than or equal to 1.
     */
    function startTimer(simulationDuration: number, timeFactor: number): void {
        simulationStartRef.current = moment().valueOf();
        setSimulationTime(0);
        simulationTimeTickerRef.current = setInterval(() => {
            const currentTime = (moment().valueOf() - simulationStartRef.current) / timeFactor / 1000;
            setSimulationTime(currentTime);
            remainingTimeRef.current = simulationDuration - currentTime;
        }, updateIntervalMs * timeFactor)
        simulationEndTimerRef.current = setTimeout(() => handleStop(), simulationDuration * 1000 * timeFactor);
    }

    /**
     * Cancels the timer. Note that this method does NOT call the the `handleStop()` callback.
     */
    function cancelTimer(): void {
        clearInterval(simulationTimeTickerRef.current);
        clearTimeout(simulationEndTimerRef.current);
        setSimulationTime(undefined);
    }

    // cleans update the interval and timers when shit unmounts
    useEffect(
        () => {
            return () => {
                clearInterval(simulationTimeTickerRef.current);
                clearTimeout(simulationEndTimerRef.current);
            }
        },
        []
    )

    return {
        simulationTime,
        remainingTime: remainingTimeRef.current,
        startTimer,
        cancelTimer
    }
}