import {Selection} from "d3";
import {Datum} from "./datumSeries";

// the axis-element type return when calling the ".call(axis)" function
export type AxisElementSelection = Selection<SVGGElement, unknown, null, undefined>;
export type SvgSelection = Selection<SVGSVGElement, any, null, undefined>;
export type BarMagnifierSelection = Selection<SVGRectElement, Datum, null, undefined>;
export type RadialMagnifierSelection = Selection<SVGCircleElement, Datum, null, undefined>;
export type LineSelection = Selection<SVGLineElement, any, SVGGElement, undefined>;
export type GSelection = Selection<SVGGElement, any, null, undefined>;
export type TrackerSelection = Selection<SVGLineElement, Datum, null, undefined>;
export type TextSelection = Selection<SVGTextElement, any, HTMLElement, any>;

export function generateChartId(): number {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

export function textWidthOf(elem: TextSelection): number {
    return elem.node()?.getBBox()?.width || 0;
}

/**
 * Properties for rendering the magnifier lenses
 */
export interface MagnifierStyle {
    visible: boolean;
    magnification: number;
    color: string;
}

export interface LineMagnifierStyle extends MagnifierStyle {
    width: number;
    lineWidth: number;
    axisOpacity?: number;
}

export interface RadialMagnifierStyle extends MagnifierStyle {
    radius: number;
    lineWidth: number,
}

export interface AxisLabelFont {
    size: number
    color: string
    weight: number
    family: string
}

/**
 * no-operation function
 */
export function noop(): void {
    /* empty */
}

