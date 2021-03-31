import * as React from "react";
import {MessageBarType} from "@fluentui/react";
import {createContext, useContext, useState} from "react";

export interface UseMessageValues {
    messageType?: MessageBarType
    messageContent?: JSX.Element
    setMessage: (messageType: MessageBarType, messageContent: JSX.Element | string) => void
    clearMessage: () => void
}

function noop() {
    /* empty */
}

const MessageContext = createContext<UseMessageValues>({
    messageContent: undefined,
    setMessage: noop,
    clearMessage: noop
})

interface Props {
    children: JSX.Element | Array<JSX.Element>;
}

/**
 * Message context provider for managing the application message state
 * @param props The props holding the children of the message context provider
 * @return The message context provider
 * @constructor
 */
export function MessageProvider(props: Props): JSX.Element {
    const {children} = props;

    const [messageType, setMessageType] = useState<MessageBarType>()
    const [messageContent, setMessageContent] = useState<JSX.Element>()

    function setMessage(messageType: MessageBarType, messageContent: JSX.Element | string): void {
        setMessageType(messageType)
        if (typeof messageContent == 'string') {
            setMessageContent(<span>{messageContent}</span>)
        } else {
            setMessageContent(messageContent)
        }
    }

    function clearMessage(): void {
        setMessageType(undefined)
        setMessageContent(undefined)
    }

    return <MessageContext.Provider value={{messageType, messageContent, setMessage, clearMessage}}>
        {children}
    </MessageContext.Provider>
}

/**
 * The react hook for managing application messages
 * @return The message state and update methods
 */
export function useMessage(): UseMessageValues {
    const context = useContext<UseMessageValues>(MessageContext)
    const {setMessage, clearMessage} = context
    if (setMessage === undefined || clearMessage === undefined) {
        throw new Error("useMessage hook can only be used when the component is a child of <MessageProvider/>")
    }
    return context;
}


