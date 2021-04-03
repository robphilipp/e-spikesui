// import * as React from 'react'
// import {SceneInfo, ScenesProvider, useScenes} from "../basethree/useScenes";
// import {AmbientLight, Scene} from "three";
// import {AXES_SCENE_ID, GRID_SCENE_ID, NETWORK_SCENE_ID} from "./Network";
//
//
// interface Props {
//     visualizationId: string;
//     children: JSX.Element | JSX.Element[]
// }
//
// export function Visualization(props: Props): JSX.Element {
//     const context = useScenes();
//
//     /**
//      * Creates and returns the scenes (and associated information) that are to be displayed
//      * @return The list of scene information objects
//      */
//     function getScenes(): Array<SceneInfo> {
//         return scenes.getOrCall(() => {
//             const light = new AmbientLight(0xffffff, 2);
//             const gridScene = new Scene();
//             gridScene.add(light);
//             const axesScene = new Scene();
//             axesScene.add(light);
//             const networkScene = new Scene();
//             networkScene.add(light);
//
//             const scenes: Array<SceneInfo> = [
//                 {name: GRID_SCENE_ID, scene: gridScene, visible: gridVisible},
//                 {name: AXES_SCENE_ID, scene: axesScene, visible: axesVisible},
//                 {name: NETWORK_SCENE_ID, scene: networkScene, visible: true}
//             ];
//             onScenesUpdate(visualizationId, scenes);
//             return scenes;
//         });
//     }
//
//     const {children} = props;
//     return <ScenesProvider>{children}</ScenesProvider>
// }