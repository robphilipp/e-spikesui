import {ITheme} from "@fluentui/style-utilities";
import {Color} from "three";
import {ColorRange} from "./neuralthree/Network";
import {useMemo} from "react";

/**
 * Hooks that calculates the color range (min, max) colors for the excitatory and inhibitory
 * neurons.
 * @param itheme The application them from which to grab the white color
 * @param excitation The color for excitation neurons (ends up being the max)
 * @param inhibition The color for inhibition neurons (ends up being the max)
 * @param attenuation The amount of attenuation used for calculating the minimum color
 */
export function useNeuronColors(itheme: ITheme,
                                excitation: Color,
                                inhibition: Color,
                                attenuation: number): ColorRange {
    const excitationMin = useMemo<Color>(
        () => new Color(excitation).lerp(new Color(itheme.palette.white), attenuation),
        [itheme, excitation, attenuation]
    );
    const excitationMax = useMemo<Color>(
        () => new Color(excitation),
        [excitation]
    );
    const inhibitionMin = useMemo<Color>(
        () => new Color(inhibition).lerpHSL(new Color(itheme.palette.white), attenuation),
        [itheme, inhibition, attenuation]
    );
    const inhibitionMax = useMemo<Color>(
        () => new Color(inhibition),
        [inhibition]
    );

    return useMemo(
        () => ({
            excitatory: {min: new Color(excitationMin), max: new Color(excitationMax)},
            inhibitory: {min: new Color(inhibitionMin), max: new Color(inhibitionMax)}
        }),
        [excitationMin, excitationMax, inhibitionMin, inhibitionMax]
    )
}

