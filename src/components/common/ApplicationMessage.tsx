import * as React from "react";
import {useMessage} from "./useMessage";
import {MessageBar} from "@fluentui/react";
import {useTheme} from "./useTheme";

export default function ApplicationMessage(): JSX.Element {
    const {messageType, messageContent, clearMessage} = useMessage()
    const {itheme} = useTheme()

    if (messageType === undefined || messageContent === undefined) {
        return <></>
    }
    return <MessageBar
        key="feedback-messages"
        messageBarType={messageType}
        isMultiline={false}
        truncated={true}
        theme={itheme}
        onDismiss={clearMessage}
        dismissButtonAriaLabel="Close"
        overflowButtonAriaLabel="See more"
    >
        {messageContent}
    </MessageBar>

}