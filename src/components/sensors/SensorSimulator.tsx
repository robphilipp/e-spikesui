import * as React from 'react';
import { useState } from 'react';
import {Subscription} from "rxjs";

interface Props {
    subscription?: Subscription;
}

export default function SensorSimulator(props: Props): JSX.Element {
    const {
        subscription
    } = props;


    return <div>Some test text</div>
}