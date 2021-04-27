import * as React from "react";
import {CSSProperties, useEffect, useRef, useState} from "react";

interface Props {
    widthFraction?: number
    heightFraction?: number
    styles?: CSSProperties
    children: JSX.Element
}

/**
 * Provides the height and width dimensions to the child component through the
 * `height` and `width` props. This is really only needed when a child component
 * needs to know its (width, height) in pixels. For example, a canvas, or a three-js
 * scene or renderer.
 *
 * When the window size changes, recalculates the width and height of the child
 * and passes the new width and height props to the child.
 *
 * @param props Holds the width and height fractions which are used to size the
 * child within the parent. The fractions must be in (0, 1]. If not specified, then
 * the width or height fraction will default to 1.
 *
 * Styling properties can be passed through the styles property.
 * @constructor
 */
export function DimensionProvider(props: Props): JSX.Element {
    const {
        widthFraction = 1,
        heightFraction = 1,
        styles = {},
        children
    } = props
    const divRef = useResizeListener()

    return <div ref={divRef} style={{
        width: asString(widthFraction),
        height: asString(heightFraction),
        ...styles
    }}>
        {React.cloneElement(
            children,
            {height: divRef.current?.clientHeight, width: divRef.current?.clientWidth}
        )}
    </div>
}

/**
 * Renders the fractional width to a fixed percentage
 * @param fraction The fraction, which must be in the interval `[0, 1]`
 * @return The fraction as a string formatted `xxx%`.
 */
function asString(fraction: number): string {
    return `${Math.floor((Math.max(0, Math.min(0.99, fraction)) * 100)).toFixed(0)}%`
}

/**
 * Listens for resizable events and causes a re-render when the window is being resized.
 * @return A reference to an HTML div element
 */
function useResizeListener(): React.MutableRefObject<HTMLDivElement | undefined> {
    const divRef = useRef<HTMLDivElement>()
    const [, setDimensions] = useState<{ width: number, height: number }>({width: 100, height: 100})
    useEffect(
        () => {
            const updateDimensions = () => setDimensions({
                height: divRef.current?.clientHeight,
                width: divRef.current?.clientWidth
            })
            window.addEventListener('resize', updateDimensions)

            return () => {
                window.removeEventListener('resize', updateDimensions)
            }
        },
        []
    )

    return divRef
}

