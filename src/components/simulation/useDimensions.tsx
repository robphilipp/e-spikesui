import * as React from 'react';
import {createContext, useContext, useEffect, useRef, useState} from "react";
import {fromEvent} from "rxjs";
import {throttleTime} from 'rxjs/operators'

interface UseDimensionValues {
    height: number;
    width: number;
}

const defaultDimensions: UseDimensionValues = {
    height: 10,
    width: 10
}

const DimensionsContext = createContext<UseDimensionValues>(defaultDimensions)

interface Props {
    heightFraction?: number;
    widthFraction?: number;
    children: JSX.Element | Array<JSX.Element>;
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

    const visContainerRef = useRef<HTMLDivElement>()

    const [height, setHeight] = useState<number>()
    const [width, setWidth] = useState<number>()

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
        setHeight(visContainerRef.current.clientHeight)
        setWidth(visContainerRef.current.clientWidth)
    }

    function asString(fraction: number): string {
        return `${Math.max(0, Math.min(1, fraction)) * 100}%`
    }

    return <div
        ref={visContainerRef}
        style={{height: `${asString(heightFraction)}`, width: `${asString(widthFraction)}`}}
    >
        <DimensionsContext.Provider value={{height, width}}>
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
