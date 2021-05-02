import * as React from 'react'
import {cloneElement, CSSProperties} from "react";

interface Props {
    numRows: number
    numColumns: number
    width?: number
    height?: number
    styles?: CSSProperties
    children: JSX.Element | Array<JSX.Element>
}

export function Grid(props: Props): JSX.Element {

    const {
        numRows,
        numColumns,
        width,
        height,
        styles,
        children
    } = props

    if (width === undefined || height === undefined) {
        return null
    }
    if (numRows <= 0) {
        throw new Error(`<Grid/> rows must be 1 or larger; specified rows: ${numRows}`)
    }
    if (numColumns <= 0) {
        throw new Error(`<Grid/> columns must be 1 or larger; specified columns: ${numColumns}`)
    }

    /**
     * Clones the children (or child) and adds the height and width props.
     * @param children An array of `GridCell` or a single JSX element
     * @return The enriched children
     */
    function enrich(children: JSX.Element | Array<JSX.Element>): JSX.Element | Array<JSX.Element> {
        const childElements = Array.isArray(children) ? children : [children];

        const invalidChildren = childElements.filter(child => !(child.type.name === "GridCell"));
        if (invalidChildren.length > 0) {
            throw new Error(
                "<Grid/> allows only <GridCell/> as children; " +
                `invalid children: ${invalidChildren.map(child => typeof child.type).join(", ")}`
            )
        }
        return childElements.map((child, index) => cloneElement(
            child,
            {
                key: `grid-cell-${child.props.row}-${child.props.column}`,
                height,
                width,
                numRows,
                numColumns
            }
        ))
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${width / numColumns})`,
            gridTemplateRows: `repeat(${numRows}, ${height / numRows})`,
            // width: width,
            // height: height
        }}>
            {enrich(children)}
        </div>
    )
}

interface CellProps {
    width?: number
    height?: number
    numRows?: number
    numColumns?: number
    column: number
    columnsSpanned?: number
    row: number
    rowsSpanned?: number
    children: JSX.Element

}

export function GridCell(props: CellProps): JSX.Element {
    const {
        width,
        height,
        numRows,
        numColumns,
        column,
        columnsSpanned = 1,
        row,
        rowsSpanned = 1,
        children
    } = props

    if (row < 1 || row > numRows) {
        throw new Error(
            `<GridCell/> row must be greater than 1 and less than the number of rows; number rows: ${numRows}; row: ${row}`
        )
    }
    if (rowsSpanned < 1) {
        throw new Error(
            `The number of rows spanned by this <GridCell/> greater than 1; rows spanned: ${rowsSpanned}`
        )
    }
    if (column < 1 || row > column) {
        throw new Error(
            `<GridCell/> column must be greater than 1 and less than the number of columns; number columns: ${numColumns}; column: ${column}`
        )
    }
    if (columnsSpanned < 1) {
        throw new Error(
            `The number of columns spanned by this <GridCell/> greater than 1; columns spanned: ${columnsSpanned}`
        )
    }

    const cellWidth = width * columnsSpanned / numColumns
    const cellHeight = height * rowsSpanned / numRows
    return (
        <div
            style={{
                gridColumnStart: column,
                gridColumnEnd: Math.min(column + columnsSpanned-1, numColumns),
                gridRowStart: row,
                gridRowEnd: Math.min(row + rowsSpanned-1, numRows),
                // width: cellWidth,
                // height: cellHeight
            }}
        >
            {cloneElement(children, {width: cellWidth, height: cellHeight})}
        </div>
    )
}