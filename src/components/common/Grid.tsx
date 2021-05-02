import * as React from 'react'
import {cloneElement, CSSProperties} from "react";

interface Props {
    // the number of rows in the grid
    numRows: number
    // the number of columns in the grid
    numColumns: number
    // the width (in pixels) of the grid
    width?: number
    // the height (in pixels) of the grid
    height?: number
    // the number pixels between rows in the grid
    rowGap?: number
    // the number pixels between columns in the grid
    columnGap?: number
    // additional styles
    styles?: CSSProperties
    // the children grid-cells
    children: JSX.Element | Array<JSX.Element>
}

/**
 * Grid layout for use when the grid cells need to pass one their size (in pixels) to their
 * children. This is useful when the child uses a canvas or svg element that needs to have its
 * explicit size set.
 *
 * The grid expects a size (width, height) in pixels, which may be supplied by the `DimensionProvider`,
 * and the number rows and columns that comprise the grid. The children of the <Grid/> must be
 * <GridCell/> elements.
 *
 * For single elements requiring a size in pixels, use the raw `DimensionProvider`.
 * @param props The properties defining the grid's dimensions and children
 * @return A JSX element representing the grid
 * @constructor
 */
export function Grid(props: Props): JSX.Element {
    const {
        numRows,
        numColumns,
        width,
        height,
        rowGap = 0,
        columnGap = 0,
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
     * Clones the children (or child) and adds the height, width, numRows, and numColumns props.
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
                height: height - rowGap,
                width: width - columnGap,
                numRows,
                numColumns
            }
        ))
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
            gridTemplateRows: `repeat(${numRows}, 1fr)`,
            rowGap,
            columnGap,
            ...styles
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
    // additional styles
    styles?: CSSProperties
    children: JSX.Element
}

/**
 * A cell in the <Grid/> whose
 * @param props
 * @constructor
 */
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
        styles,
        children,
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
                gridColumnEnd: Math.min(column + columnsSpanned, numColumns+1),
                gridRowStart: row,
                gridRowEnd: Math.min(row + rowsSpanned, numRows+1),
                // width: cellWidth,
                // height: cellHeight,
                ...styles
            }}
        >
            {cloneElement(children, {width: cellWidth, height: cellHeight})}
        </div>
    )
}