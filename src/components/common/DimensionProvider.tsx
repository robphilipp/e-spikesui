import * as React from "react";
import {cloneElement, createRef, CSSProperties, useEffect, useRef, useState} from "react";

interface Props {
    widthFraction?: number
    heightFraction?: number
    styles?: CSSProperties
    children: JSX.Element | Array<JSX.Element>
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

    /**
     * Clones the children (or child) and adds the height and width props.
     * @param children An array of `ApportionProviders` or a single JSX element
     * @return The enriched children
     */
    function enrich(children: JSX.Element | Array<JSX.Element>): JSX.Element | Array<JSX.Element> {
        if (Array.isArray(children)) {
            const invalidChildren = children.filter(child => !(child.type.name === "ApportionProvider"));
            if (invalidChildren.length > 0) {
                throw new Error(
                    "<DimensionProvider/> allows multiple children only when all those children are <ApportionProviders/>; " +
                    `invalid children: ${invalidChildren.map(child => typeof child.type).join(", ")}`
                )
            }
            return children.map(child => cloneElement(
                child,
                {height: divRef.current?.clientHeight, width: divRef.current?.clientWidth}
            ))
        }
        return cloneElement(children, {height: divRef.current?.clientHeight, width: divRef.current?.clientWidth})
    }

    console.log("dim provider", divRef.current?.clientHeight, divRef.current?.clientWidth)
    return <div
        ref={divRef}
        style={{
            width: asString(widthFraction),
            height: asString(heightFraction),
            ...styles
        }}
    >
        {enrich(children)}
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
                height: Math.floor(divRef.current?.offsetHeight),
                width: Math.floor(divRef.current?.offsetWidth)
            })
            updateDimensions()
            window.addEventListener('resize', updateDimensions)

            return () => {
                window.removeEventListener('resize', updateDimensions)
            }
        },
        []
    )

    return divRef
}

interface ApportionProps {
    height?: number
    width?: number
    heightFraction?: number
    widthFraction?: number
    children: JSX.Element
}

export function ApportionProvider(props: ApportionProps): JSX.Element {
    const {
        heightFraction = 1,
        widthFraction = 1,
        height = 100,
        width = 100,
        children,
    } = props

    function boundToUnit(value: number): number {
        return Math.max(0, Math.min(value, 0.99))
    }

    return <>
        {cloneElement(
            children,
            {width: width * boundToUnit(widthFraction), height: height * boundToUnit(heightFraction)}
        )}
    </>
}

