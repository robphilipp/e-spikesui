import * as React from 'react';
import tinycolor from "tinycolor2";
import {ITheme, Spinner, SpinnerSize} from "@fluentui/react";

interface Props {
    itheme: ITheme;
    isLoading: boolean;
    message?: string;
}

export default function LoadingModal(props: Props): JSX.Element {
    const {
        itheme,
        isLoading,
        message = '',
    } = props;

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
                // transition: 'background 2s ease-in-out',
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