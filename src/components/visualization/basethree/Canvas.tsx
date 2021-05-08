import * as React from 'react';
import {forwardRef, MutableRefObject, useEffect} from 'react';
import {mergeProperties} from "./mergeProperties";

/**
 * Canvas style that allows additional style fields
 */
export interface CanvasStyle {
    zIndex?: number;
    outline?: string;
    [propName: string]: string | number;
}

/**
 * Canvas properties
 */
export interface CanvasProps {
    canvasId: string;
    // additional style properties
    style: CanvasStyle
}

/**
 * The initial canvas style
 */
export const initialCanvasStyle: CanvasStyle = {
    position: "absolute",
    zIndex: -1,
    outline: "none"
};

export const initialCanvasProps = {
    canvasId: "",
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
    const {canvasId, style,} = props;

    return (
        <canvas
            id={canvasId}
            ref={ref}
            height={style.height}
            width={style.width}
            style={mergeProperties(initialCanvasStyle, style)}
        />
    );
}

export default forwardRef(Canvas);
