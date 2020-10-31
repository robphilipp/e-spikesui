import {app, BrowserWindow, dialog, ipcMain, IpcMainEvent, session} from 'electron';
import path from 'path'
import os from 'os'

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

function createWindow(): BrowserWindow {
    // create the browser window.
    const mainWindow = new BrowserWindow({
        height: 800,
        width: 800,
        useContentSize: true,

        webPreferences: {
            // addition of `prelude-ts` caused "Uncaught ReferenceError: require is not defined"
            // error when running; this fixes it
            nodeIntegration: true,
            // allows running web-workers at the OS thread level
            nodeIntegrationInWorker: true,
            // allows the renderer process to access "remote" objects from the main process
            // (e.g. dialog)
            enableRemoteModule: true
        }
    });

    // load the dev tool extensions for debugging (react, redux)
    // tried `electron-devtools-installer` but couldn't get it to work
    session.defaultSession.loadExtension(
        path.join(os.homedir(), '/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/4.8.2_0')
    ).then(ext => {
        console.log(`Loaded extension; name: ${ext.name}; id: ${ext.id}; path: ${ext.path}`)
    }).catch(reason => {
        console.log(`Failed to load React devtools extension; error: ${reason.toString()}`)
    })
    session.defaultSession.loadExtension(
        path.join(os.homedir(), '/Library/Application Support/Google/Chrome/Default/Extensions/lmhkpmbekcpmknklioeibfkpmmfibljd/2.17.0_0')
    ).then(ext => {
        console.log(`Loaded extension; name: ${ext.name}; id: ${ext.id}; path: ${ext.path}`)
    }).catch(reason => {
        console.log(`Failed to load Redux devtools extension; error: ${reason.toString()}`)
    });

    // and load the index.html of the app.
    mainWindow
        .loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
        .then(() => {
            console.log(`Loaded main html page; path: ${MAIN_WINDOW_WEBPACK_ENTRY}`)
        })
        .catch(reason => {
            console.log(`Failed to load main html page; path: ${MAIN_WINDOW_WEBPACK_ENTRY}; error: ${reason.toString()}`)
        });

    // open dev tools initially when in development mode
    if (process.env.NODE_ENV === "development") {
        mainWindow.webContents.on("did-frame-finish-load", () => {
            mainWindow.webContents.once("devtools-opened", () => {
                mainWindow.focus();
            });
            mainWindow.webContents.openDevTools();
        });
    }

    return mainWindow;
}

// /**
//  * Registers the IPC listeners for working with the render processes
//  * @param mainWindow The main window
//  */
// function registerIpcListeners(mainWindow: BrowserWindow): void {
//     ipcMain.on('save-network-description', (event: IpcMainEvent, args) => {
//         dialog
//             .showSaveDialog(mainWindow, {title: 'Save As...'})
//             .then(retVal => event.reply('save-network-description-path', retVal.filePath))
//     });
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow();
    // const mainWindow = createWindow();
    // registerIpcListeners(mainWindow);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        // const mainWindow = createWindow();
        // registerIpcListeners(mainWindow);
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
