import * as React from 'react';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {fromEvent} from 'rxjs';

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

interface Props {
    // the height and width fractions are used in the container div
    // to set the height and width as fractions, which then in turn,
    // provide the actual height and width through the containerRef
    heightFraction?: number
    widthFraction?: number
    //
    heightAdjustment?: number
    widthAdjustment?: number
    children: JSX.Element | Array<JSX.Element>
}

/**
 * Provides the dimensions of a the container <div> to the children. Listens to
 * window resize events and updates the height and width state and re-renders.
 * The re-render causes the context-provider's values to change. Any provided,
 * optional, width and height fractions, are maintained during resize.
 * @param props The height and width fraction, and the children
 * @constructor
 */
export default function DimensionsProvider(props: Props): JSX.Element {
    const {
        heightFraction = 1,
        widthFraction = 1,
        heightAdjustment = 0,
        widthAdjustment = 0,
        children
    } = props;

    // the div element acting as a container whose dimensions are set as the height
    // and width fractions in its style tag so that it can provide a width and height
    // through its properties
    const containerRef = useRef<HTMLDivElement>()

    // really only used to rerender when the window size has changed
    const [, setDimensions] = useState<Dimensions>({height: 100, width: 100})

    useEffect(
        () => {
            // set the initial dimensions
            handleWindowResize()

            // handle window resized events
            const subscription = fromEvent(window, 'resize').subscribe(handleWindowResize)
            // window.addEventListener('resize', event => handleWindowResize(event))

            return () => {
                // stop listening for window resizing events
                subscription.unsubscribe()
            }
        },
        []
    )


    /**
     * Update the dimensions based on the current the updated div size
     */
    function handleWindowResize(): void {
        setDimensions({
            height: containerRef.current.clientHeight + heightAdjustment,
            width: containerRef.current.clientWidth + widthAdjustment
        })
    }

    /**
     * Renders the fractional width to a fixed percentage
     * @param fraction The fraction, which must be in the interval `[0, 1]`
     * @return The fraction as a string formatted `xxx%`.
     */
    function asString(fraction: number): string {
        return `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(0)}%`
    }

    return <div
        ref={containerRef}
        style={{height: `${asString(heightFraction)}`, width: `${asString(widthFraction)}`}}
    >
        <DimensionsContext.Provider value={{
            height: containerRef.current?.clientHeight,
            width: containerRef.current?.clientWidth
        }}
        >
            {children}
        </DimensionsContext.Provider>
    </div>
}

/**
 * React hook that must be used within a {@link DimensionsProvider}
 * @return The dimensions values of the element
 */
export function useDimensions(): UseDimensionValues {
    const context = useContext<UseDimensionValues>(DimensionsContext)
    const {width, height} = context
    if (width === undefined || height === undefined) {
        throw new Error("useDimensions can only be used when the parent is a <DimensionsProvider/>")
    }
    return context
}
