// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const nj = require("numjs");

function extract(data, mask, shift) {
  var res = [];
  for (var i = 0; i < data.shape[0]; i++) {
    var temp = (data.get(i) >> shift) & mask;
    res.push(temp);
  }
  res = nj.array(res);
  return res;
}

function fileNameToData(fileName, endian = ">", dataType = "u4") {
  var buf = fs.readFileSync(fileName);
  var fun = "read";
  var singleSize = 4;
  switch (dataType) {
    case "u2":
      fun += "UInt16";
      singleSize = 2;
      break;
    case "i2":
      fun += "Int16";
      singleSize = 2;
      break;
    case "u4":
      fun += "UInt32";
      singleSize = 4;
      break;
    case "i4":
      fun += "Int32";
      singleSize = 4;
      break;
    case "u8":
      fun += "BigUInt64";
      singleSize = 8;
      break;
    case "i8":
      fun += "BigInt64";
      singleSize = 8;
      break;
    case "f4":
      fun += "Float";
      singleSize = 4;
      break;
    case "f8":
      fun += "Double";
      singleSize = 8;
      break;
    default:
      fun += "UInt32";
      singleSize = 4;
      break;
  }
  switch (endian) {
    case ">":
      fun += "BE";
      break;
    case "<":
      fun += "LE";
      break;
    default:
      fun += "BE";
      break;
  }
  var res = [];
  for (var i = 0; i < buf.length; i += singleSize) {
    res.push(buf[fun](i));
  }
  res = nj.array(res);
  return res;
}

function dataToTPYX(data, p_mask = 0x1, p_shift = 0, y_mask = 0x7FFF, y_shift = 16, x_mask = 0x7FFF, x_shift = 1, sampling = 1000) {
  var xyp = data.slice([null, null, 2]);
  var t = data.slice(1).slice([null, null, 2]);
  var p = extract(xyp, p_mask, p_shift);
  var y = extract(xyp, y_mask, y_shift);
  var x = extract(xyp, x_mask, x_shift);
  var res = nj.array([t.tolist(), p.tolist(), y.tolist(), x.tolist()]).transpose();
  return res;
}

ipcMain.on("selectFile", (event) => {
  var result = dialog.showOpenDialogSync({
    filters: [
      { name: 'Event File', extensions: ['aedat'] }
    ],
    properties: ["openFile", "createDirectory", "dontAddToRecent"]
  });
  if (result && result.length) {
    var fileName = result[0];
    var res = dataToTPYX(fileNameToData(fileName)).tolist();
    event.reply("selectedItem", { "file_name": fileName, "data": res });
  } else {
    event.reply("selectedItem", { "file_name": "", "data": [] });
  }
});

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      icon: path.join(__dirname, 'favicon.ico'),
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
