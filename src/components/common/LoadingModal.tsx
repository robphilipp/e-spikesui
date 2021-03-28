import * as React from 'react';
import tinycolor from "tinycolor2";
import {ITheme, Spinner, SpinnerSize} from "@fluentui/react";
import {useLoading} from "./useLoading";
import {useTheme} from "./useTheme";

// interface Props {
//     itheme: ITheme;
// }

/**
 * Displays a modal with a spinner and message that covers and blocks the
 * entire screen
 * @param props The properties holding the theme, whether it is loading, and
 * any messages to display
 * @constructor
 */
// export default function LoadingModal(props: Props): JSX.Element {
export default function LoadingModal(): JSX.Element {
    // const {itheme} = props;

    const {itheme} = useTheme()
    const {isLoading, message} = useLoading()

    return <>
        {isLoading ?
            <div style={{
                zIndex: 10000,
                margin: '-8px',
                width: '100%',
                height: '100%',
                background: tinycolor(itheme.palette.black).setAlpha(0.5).toRgbString(),
                display: 'flex',
                position: 'absolute',
                transition: 'ease-in-out',
                transitionProperty: 'background-color',
                transitionDuration: '500ms',
                flex: 'auto',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div
                    style={{
                        display: 'flex',
                        position: 'absolute',
                        flex: 'auto',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '450px',
                        height: '150px',
                        background: tinycolor(itheme.palette.white).toRgbString(),
                        borderRadius: '5px',
                    }}
                >
                    <Spinner
                        size={SpinnerSize.large}
                        label={message}
                    />
                </div>
            </div> :
            <div/>
        }
    </>
}