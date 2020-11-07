import * as React from "react";
import {useEffect, useState} from "react";

import {KafkaBroker, KafkaSettings} from "./kafkaSettings";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {changeKafkaSettings} from "../redux/actions/settings";
import {connect} from "react-redux";
import {DetailsList, DetailsListLayoutMode, IColumn, SelectionMode} from "@fluentui/react";

interface StateProps {
    kafkaSettings: KafkaSettings;
}

interface DispatchProps {
    onChangeKafkaSettings: (settings: KafkaSettings) => void;
}

type Props = StateProps & DispatchProps


// const classNames = mergeStyleSets({
//     brokerHostCell: {
//         textAlign: 'left',
//         minWidth: '70%',
//         // selectors: {
//         //     '&:before': {
//         //         content: '.',
//         //         display: 'inline-block',
//         //         verticalAlign: 'middle',
//         //         height: '100%',
//         //         width: '0px',
//         //         visibility: 'hidden'
//         //     }
//         // }
//     },
//     brokerPortCell: {
//         verticalAlign: 'right',
//         maxWidth: '20%',
//         // maxHeight: '16px',
//         // maxWidth: '16px'
//     },
//     // controlWrapper: {
//     //     display: 'flex',
//     //     flexWrap: 'wrap'
//     // },
//     // exampleToggle: {
//     //     display: 'inline-block',
//     //     marginBottom: '10px',
//     //     marginRight: '30px'
//     // },
//     // selectionDetails: {
//     //     marginBottom: '20px'
//     // }
// });
// const controlStyles = {
//     root: {
//         margin: '0 30px 20px 0',
//         maxWidth: '300px'
//     }
// };

/**
 * Holds the list of kafka brokers and allows the user to update, add, and remove brokers
 * @param props The properties from the parent or from redux
 * @return The react component representing the kafka broker list
 * @constructor
 */
function KafkaSettingsEditor(props: Props): JSX.Element {

    const columns: IColumn[] = [
        {
            key: 'brokerHost',
            name: 'Hostname or IP',
            // className: classNames.brokerHostCell,
            // iconClassName: classNames.fileIconHeaderIcon,
            ariaLabel: 'click to sort on hostname',
            // iconName: 'Page',
            isIconOnly: false,
            fieldName: 'host',
            minWidth: 50,
            maxWidth: 300,
            data: 'string',
            isResizable: true,
            onColumnClick: (event, column) => onColumnClick(event, column),
            // onRender: (item: KafkaBroker) => {
            //     return <span>{item.host}</span>;
            // }
        },
        {
            key: 'brokerPort',
            name: 'Port',
            // className: classNames.brokerPortCell,
            // iconClassName: classNames.fileIconHeaderIcon,
            ariaLabel: 'click to sort on port',
            // iconName: 'Page',
            isIconOnly: false,
            fieldName: 'port',
            minWidth: 40,
            maxWidth: 100,
            data: 'number',
            isResizable: true,
            isSorted: true,
            isSortedDescending: true,
            sortAscendingAriaLabel: 'Sorted A to Z',
            sortDescendingAriaLabel: 'Sorted Z to A',
            onColumnClick: (event, column) => onColumnClick(event, column),
            // onRender: (item: KafkaBroker) => {
            //     return <span>{item.port}</span>;
            // }
        }
    ];

    const [currentColumns, setCurrentColumns] = useState<Array<IColumn>>(columns);
    const [currentBrokers, setCurrentBrokers] = useState<Array<KafkaBroker>>(props.kafkaSettings.brokers);

    useEffect(
        () => {
            setCurrentBrokers(sortRowsBy(enrichBrokers(props.kafkaSettings.brokers), 'port'));
        },
        [props.kafkaSettings]
    );

    function onColumnClick(event: React.MouseEvent<HTMLElement>, column: IColumn): void {
        const newColumns: IColumn[] = currentColumns.slice();
        const currColumn: IColumn = newColumns.filter(currCol => column.key === currCol.key)[0];
        newColumns.forEach((newCol: IColumn) => {
            if (newCol === currColumn) {
                currColumn.isSortedDescending = !currColumn.isSortedDescending;
                currColumn.isSorted = true;
            } else {
                newCol.isSortedDescending = true;
                newCol.isSorted = false;
            }
        });
        setCurrentColumns(newColumns);
        setCurrentBrokers(sortRowsBy(currentBrokers, currColumn.fieldName, currColumn.isSortedDescending));
    }

    return (
        <DetailsList
            items={currentBrokers}
            compact={true}
            columns={columns}
            selectionMode={SelectionMode.single}
            getKey={item => item.key}
            setKey="none"
            layoutMode={DetailsListLayoutMode.justified}
            isHeaderVisible={true}
            // onItemInvoked={this._onItemInvoked}

        />
    );
}

/*
 |
 | UTILS
 |
 */
function enrichBrokers(brokers: Array<KafkaBroker>): Array<KafkaBroker> {
    return brokers.map((broker, i) => ({
        key: i.toString(),
        host: broker.host,
        port: broker.port
    }));
}

function sortRowsBy<T>(rows: T[], columnKey: string, isSortedDescending = false): T[] {
    const key = columnKey as keyof T;
    const factor = isSortedDescending ? -1 : 1;
    return rows.slice().sort((a: T, b: T) => a[key] > b[key] ? factor : -1 * factor);
}

/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions.ts for the action types)
 |
 */

/**
 * react-redux function that maps the application state to the props used by the `App` component.
 * @param state The updated application state
 * @return The state properties
 */
function mapStateToProps(state: AppState): StateProps {
    return {
        kafkaSettings: state.settings.kafka
    }
}

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
function mapDispatchToProps(dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps {
    return {
        onChangeKafkaSettings: (settings: KafkaSettings) => dispatch(changeKafkaSettings(settings))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(KafkaSettingsEditor)