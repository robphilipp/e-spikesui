import * as React from "react";
import {useMessage} from "./useMessage";
import {MessageBar} from "@fluentui/react";
import {useTheme} from "./useTheme";
import {useRef} from "react";

interface Props {
    autoClose?: boolean;
    closeAfterMs?: number;
}

/**
 * Returns the application-level message bar for notifying the user. By default
 * the message bar will disappear after 5 seconds. To prevent this default behavior,
 * set the `autoClose` to `false`. To change the time after which the message bar
 * closes, set the `closeAfterMs` property.
 * @param props The properties for changing the auto-close behavior
 * @return a message bar, if one is present
 * @constructor
 */
export default function ApplicationMessage(props: Props): JSX.Element {
    const {autoClose = true, closeAfterMs = 5000} = props;

    const {messageType, messageContent, clearMessage} = useMessage()
    const {itheme} = useTheme()

    const clearMessageTimeoutRef = useRef<NodeJS.Timeout>()

    // no message is defined, so just return an empty fragment
    if (messageType === undefined || messageContent === undefined) {
        return <></>
    }

    /**
     * Closes the message bar after the specified time-out
     */
    function closeMessageBar(): void {
        if (clearMessageTimeoutRef.current) {
            clearTimeout(clearMessageTimeoutRef.current)
        }
        clearMessage()
    }

    // when auto-close is set, then set a time-out to close the message after
    // the specified amount of time
    if (autoClose) {
       clearMessageTimeoutRef.current = setTimeout(() => clearMessage(), closeAfterMs)
    }

    return <MessageBar
        key="feedback-messages"
        messageBarType={messageType}
        isMultiline={false}
        truncated={true}
        theme={itheme}
        onDismiss={closeMessageBar}
        dismissButtonAriaLabel="Close"
        overflowButtonAriaLabel="See more"
    >
        {messageContent}
    </MessageBar>

}