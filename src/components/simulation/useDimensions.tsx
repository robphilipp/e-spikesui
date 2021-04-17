import * as React from 'react';
import {createContext, useContext, useEffect, useRef, useState} from "react";
import {fromEvent} from "rxjs";
import {throttleTime} from 'rxjs/operators'

interface UseDimensionValues {
    height: number;
    width: number;
}

type Dimensions = UseDimensionValues

const defaultDimensions: UseDimensionValues = {
    height: 10,
    width: 10
}

const DimensionsContext = createContext<UseDimensionValues>(defaultDimensions)

function dimensionChange(current: Dimensions, previous: Dimensions): number {
    return Math.sqrt(
        (current.width - previous.width) * (current.width - previous.width) +
        (current.height - previous.height) * (current.height - previous.height)
    )
}

interface Props {
    heightFraction?: number
    widthFraction?: number
    children: JSX.Element | Array<JSX.Element>
}

/**
 * Provides the dimensions of a the container <div> to the children. Listens to
 * window resize events and updates the height and width state and re-renders.
 * @param props The height and width fraction, and the children
 * @constructor
 */
export default function DimensionsProvider(props: Props): JSX.Element {
    const {
        heightFraction = 1,
        widthFraction = 1,
        children
    } = props;

    const containerRef = useRef<HTMLDivElement>()

    const [dimensions, setDimensions] = useState<Dimensions>({height: 100, width: 100})

    useEffect(
        () => {
            // set the initial dimensions
            handleWindowResize()

            // listen for window resizing events
            window.addEventListener('resize', handleWindowResize);

            return () => {
                // stop listening for window resizing events
                window.removeEventListener('resize', handleWindowResize);
            }
        },
        []
    )

    /**
     * Update the dimensions based on the current the updated div size
     */
    function handleWindowResize(): void {
        setDimensions({
            height: containerRef.current.clientHeight,
            width: containerRef.current.clientWidth
        })
    }

    function asString(fraction: number): string {
        return `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(0)}%`
    }

    return <div
        ref={containerRef}
        style={{height: `${asString(heightFraction)}`, width: `${asString(widthFraction)}`}}
    >
        <DimensionsContext.Provider value={{height: dimensions.height, width: dimensions.width}}>
            {children}
        </DimensionsContext.Provider>
    </div>
}

export function useDimensions(): UseDimensionValues {
    const context = useContext<UseDimensionValues>(DimensionsContext)
    const {width, height} = context
    if (width === undefined || height === undefined) {
        throw new Error("useDimensions can only be used when the parent is a <DimensionsProvider/>")
    }
    return context
}
