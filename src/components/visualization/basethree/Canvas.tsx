import * as React from 'react';
import {forwardRef, MutableRefObject, useEffect} from 'react';
import {mergeProperties} from "./mergeProperties";

/**
 * Canvas style that allows additional style fields
 */
export interface CanvasStyle {
    height: string;
    width: string;
    zIndex?: number;
    outline?: string;
    [propName: string]: any;
}

/**
 * Canvas properties
 */
export interface CanvasProps {
    // width in pixels
    width: number;
    // height in pixels
    height: number;
    // additional style properties
    style: CanvasStyle
}

/**
 * The initial canvas style
 */
export const initialCanvasStyle: CanvasStyle = {
    position: "absolute",
    height: "100%",
    width: "100%",
    zIndex: -1,
    outline: "none"
};

export const initialCanvasProps = {
    width: 100,
    height: 100,
    style: initialCanvasStyle
};

/**
 * React component wrapping the html canvas object
 * @param {CanvasProps} props The properties for the canvas
 * @param {React.MutableRefObject<HTMLCanvasElement>} ref The react reference-object for the canvas
 * @return {Element} The canvas element
 * @constructor
 */
function Canvas(props: CanvasProps = initialCanvasProps, ref: MutableRefObject<HTMLCanvasElement>): JSX.Element {

    /**
     * Updates the size of the canvas when the window is resized
     * @callback
     */
    function onWindowResize(): void {
        ref.current!.style.height = props.style.height;
        ref.current!.style.width = props.style.width;
    }

    // called when the component has mounted, just after the first render (note the deps
    // are an empty array).
    useEffect(
        (): () => void => {
            window.addEventListener('resize', onWindowResize);

            // clean-up method
            return () => {
                window.removeEventListener('resize', onWindowResize);
            };
        },
        []
    );

    return (
        <canvas
            ref={ref}
            height={props.style.height}
            width={props.style.width}
            style={mergeProperties(initialCanvasStyle, props.style)}
        />
    );
}

//@ts-ignore
export default forwardRef(Canvas);
