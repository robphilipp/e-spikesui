import * as React from 'react';
import tinycolor from "tinycolor2";
import {ITheme, Spinner, SpinnerSize} from "@fluentui/react";
import {createContext, useContext, useEffect, useState} from "react";

interface LoadingProps {
    isLoading: boolean;
    message?: string;
    updateLoadingState: (isLoading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingProps>(undefined);

interface Props {
    itheme: ITheme;
    children: JSX.Element | Array<JSX.Element>;
}

/**
 * Displays a modal with a spinner and message that covers and blocks the
 * entire screen
 * @param props The properties holding the theme, whether it is loading, and
 * any messages to display
 * @constructor
 */
export default function LoadingModal(props: Props): JSX.Element {
    const {itheme, children} = props;

    const [isLoading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>();

    function updateLoadingState(isLoading: boolean, message?: string): void {
        setLoading(isLoading);
        setMessage(message);
    }

    return <LoadingContext.Provider value={{isLoading, message, updateLoadingState}}>
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
        {children}
    </LoadingContext.Provider>
}

export function useLoading(): LoadingProps {
    return useContext<LoadingProps>(LoadingContext)
}