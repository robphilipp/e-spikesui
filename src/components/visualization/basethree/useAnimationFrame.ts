import {useEffect, useLayoutEffect, useRef} from 'react';

/**
 * Custom react hook for dealing with the animation frame. Calls `requestAnimationFrame` after the
 * first render, and `cancelAnimationFrame` on dismount, and updates the callback reference whenever
 * the callback function changes.
 *
 * Runs an animation loop that calls the callback each time the browser is about to repaint so that
 * the animation can be updated.
 * @param {(timer: number) => void} callback Function called by the animation frame in which the
 * animation should be updated. Hands the callback function the time since the start of the animation.
 */
function useAnimationFrame(callback: (timer: number) => void): void {

    // const callbackRef = useRef<(timer: number) => void>(callback);
    const frameRef = useRef<number>(0);

    /**
     * The animation loop that is called whenever the browser is ready to repaint so that the animation
     * can be updated, and so requests notification for the next animation frame, and then calls the
     * callback that is responsible for updating the animation
     * @param {number} time The time since the start of the animation
     * @private
     */
    function loop(time: number): void {
        // callbackRef.current(time);
        // frameRef.current = requestAnimationFrame(loop);
        frameRef.current = requestAnimationFrame(loop);
        // callbackRef.current(time);
        callback(time);
    }

    // // called when the component mounts, dismounts, and whenever the callback function changes
    // useLayoutEffect(
    //     (): void => {
    //         callbackRef.current = callback;
    //     },
    //     [callback]
    // );

    // called then the component mounts and is rendered; and again when the component dismounts
    useLayoutEffect(
        () => {
            frameRef.current = requestAnimationFrame(loop);

            // clean-up function
            return (): void => cancelAnimationFrame(frameRef.current);
        },
        []
    );
}

export default useAnimationFrame;
// import {useRef, useLayoutEffect} from 'react';
//
// /**
//  * Custom react hook for dealing with the animation frame. Calls `requestAnimationFrame` after the
//  * first render, and `cancelAnimationFrame` on dismount, and updates the callback reference whenever
//  * the callback function changes.
//  *
//  * Runs an animation loop that calls the callback each time the browser is about to repaint so that
//  * the animation can be updated.
//  * @param {(timer: number) => void} callback Function called by the animation frame in which the
//  * animation should be updated. Hands the callback function the time since the start of the animation.
//  */
// function useAnimationFrame(callback: (timer: number) => void): void {
//
//     const callbackRef = useRef<(timer: number) => void>(callback);
//     const frameRef = useRef<number>(0);
//
//     /**
//      * The animation loop that is called whenever the browser is ready to repaint so that the animation
//      * can be updated, and so requests notification for the next animation frame, and then calls the
//      * callback that is responsible for updating the animation
//      * @param {number} time The time since the start of the animation
//      * @private
//      */
//     function loop(time: number): void {
//         // callbackRef.current(time);
//         // frameRef.current = requestAnimationFrame(loop);
//         frameRef.current = requestAnimationFrame(loop);
//         callbackRef.current(time);
//     }
//
//     // called when the component mounts, dismounts, and whenever the callback function changes
//     useLayoutEffect(
//         (): void => {
//             callbackRef.current = callback;
//         },
//         [callback]
//     );
//
//     // called then the component mounts and is rendered; and again when the component dismounts
//     useLayoutEffect(
//         () => {
//             frameRef.current = requestAnimationFrame(loop);
//
//             // clean-up function
//             return (): void => cancelAnimationFrame(frameRef.current);
//         },
//         []
//     );
// }
//
// export default useAnimationFrame;
