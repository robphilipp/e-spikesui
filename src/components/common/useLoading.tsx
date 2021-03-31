import * as React from 'react';
import {createContext, useContext, useState} from 'react';

interface UseLoadingValues {
    isLoading: boolean;
    message?: string;
    updateLoadingState: (isLoading: boolean, message?: string) => void;
}

function noop() {
    /* empty */
}
const LoadingContext = createContext<UseLoadingValues>({isLoading: false, updateLoadingState: noop});

interface Props {
    children: JSX.Element | Array<JSX.Element>;
}

/**
 * Manages the loading state for the children
 * @param props The properties holding the children
 * @constructor
 */
export default function LoadingProvider(props: Props): JSX.Element {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>();

    function updateLoadingState(isLoading: boolean, message?: string): void {
        setLoading(isLoading);
        setMessage(message);
    }

    const {children} = props;
    return <LoadingContext.Provider value={{isLoading, message, updateLoadingState}}>
        {children}
    </LoadingContext.Provider>
}

/**
 * React hook for managing the loading state
 * @return An object that specifies whether a child is loading, the loading message,
 * and the function used by children to update the loading state
 */
export function useLoading(): UseLoadingValues {
    const context = useContext<UseLoadingValues>(LoadingContext)
    const {updateLoadingState} = context
    if (updateLoadingState === undefined) {
        throw new Error("useLoading hook can only be used when the component is a child of <LoadingProvider/>")
    }
    return context;
}
