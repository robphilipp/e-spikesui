import {Margin} from "./margins";
import {AxisLabelFont, LineMagnifierStyle, RadialMagnifierStyle} from "./chartUtils";
import {CSSProperties, SVGProps} from "react";
import {defaultTooltipStyle, TooltipStyle} from "./TooltipStyle";
import {defaultTrackerStyle, TrackerStyle} from "./TrackerStyle";
import {initialSvgStyle, SvgStyle} from "./svgStyle";

export const defaultMargin: Margin = {top: 30, right: 20, bottom: 30, left: 50}
export const defaultAxesStyle: CSSProperties = {color: '#d2933f'}
export const defaultAxesLabelFont: AxisLabelFont = {
    size: 12,
    color: '#d2933f',
    weight: 300,
    family: 'sans-serif'
}

/**
 * Default properties for rendering the magnifier lenses
 */
export const defaultLineMagnifierStyle: LineMagnifierStyle = {
    visible: false,
    width: 125,
    magnification: 1,
    color: '#d2933f',
    lineWidth: 1,
    axisOpacity: 0.35
};

export const defaultRadialMagnifierStyle: RadialMagnifierStyle = {
    visible: false,
    radius: 100,
    magnification: 5,
    color: '#d2933f',
    lineWidth: 2,
};

export interface BaseChartOverrideStyles {
    margin: Partial<Margin>
    axisStyle: CSSProperties
    axisLabelFont: Partial<AxisLabelFont>
    tooltip: Partial<TooltipStyle>
    tracker: Partial<TrackerStyle>
    svgStyle: SvgStyle
}

export interface BaseChartStyles {
    margin: Margin
    axisStyle: CSSProperties
    axisLabelFont: AxisLabelFont
    tooltip: TooltipStyle
    tracker: TrackerStyle
    svgStyle: SvgStyle
}

export function mergeStyleDefaults(overrideStyles: BaseChartOverrideStyles): BaseChartStyles {
    return {
        margin: {...defaultMargin, ...overrideStyles.margin},
        axisStyle: {...defaultAxesStyle, ...overrideStyles.axisStyle},
        axisLabelFont: {...defaultAxesLabelFont, ...overrideStyles.axisLabelFont},
        tooltip: {...defaultTooltipStyle, ...overrideStyles.tooltip},
        tracker: {...defaultTrackerStyle, ...overrideStyles.tracker},
        svgStyle: {...initialSvgStyle, ...overrideStyles.svgStyle},
    }
}
