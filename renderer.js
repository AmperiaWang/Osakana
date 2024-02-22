/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
var pageTitle, folderSelector, eventViewer, eventInfo, viewerSlider, playBtn;

var currentFile = "";
var eventData = [];
var frameSize = 5000;
var frameCount = 1;
var playEvent = false;
var currentFrame = 0;

function getInputVal(id, prefix = "") {
    return parseInt(prefix + $(id).val());
}

function extract(data, mask, shift) {
    var res = [];
    for (var i = 0; i < data.length; i++) {
        var temp = (data[i] >> shift) & mask;
        res.push(temp);
    }
    return res;
}

function dataToTPYX(data) {
    var xyp = [], t = [];
    var p_mask = getInputVal("#p-mask", "0x"), p_shift = getInputVal("#p-shift"),
        y_mask = getInputVal("#y-mask", "0x"), y_shift = getInputVal("#y-shift"),
        x_mask = getInputVal("#x-mask", "0x"), x_shift = getInputVal("#x-shift");
    for (var i = 0; i < Math.floor(data.length / 2); i++) {
        xyp.push(data[2 * i]);
        t.push(data[2 * i + 1]);
    }
    console.log(xyp.length, t.length);
    var p = extract(xyp, p_mask, p_shift);
    var y = extract(xyp, y_mask, y_shift);
    var x = extract(xyp, x_mask, x_shift);
    var res = [];
    for (var i = 0; i < Math.min(xyp.length, t.length); i++) {
        res.push([t[i], p[i], y[i], x[i]]);
    }
    return res;
}

function updateDisplay() {
    var pos = [], neg = [];
    for (var i = 0; i < eventData.length; i++) {
        if (eventData[i][0] >= frameSize * currentFrame && eventData[i][0] < frameSize * (currentFrame + 1)) {
            if (eventData[i][1]) {
                pos.push([eventData[i][2], eventData[i][3]]);
            } else {
                neg.push([eventData[i][2], eventData[i][3]]);
            }
        }
    }
    eventViewer.setOption({
        xAxis: {
            min: 0,
            max: getInputVal("#width") - 1,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        yAxis: {
            min: 0,
            max: getInputVal("#height") - 1,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        series: [
            {
                type: 'scatter',
                color: ["#0000ff"],
                symbolSize: 2,
                data: pos
            },
            {
                type: 'scatter',
                color: ["#ff0000"],
                symbolSize: 2,
                data: neg
            }
        ]
    });
    eventInfo.find("#current-frame").text(currentFrame);
    eventInfo.find("#total-frame").text(frameCount);
    eventInfo.find("#current-timestamp").text((frameSize * currentFrame) + " ~ " + (frameSize * (currentFrame + 1) - 1));
    viewerSlider.val(currentFrame + 1);
}

function play(frameID) {
    if (frameID < frameCount) {
        updateDisplay();
        if (playEvent) {
            setTimeout(() => {
                currentFrame++;
                play(currentFrame);
            }, frameSize / 1000);
        }
    } else {
        playEvent = false;
        playBtn.find("i").html("play_arrow");
        currentFrame = 0;
        updateDisplay();
    }
}

$(function () {
    mdui.setColorScheme("#9dc3e6");
    pageTitle = $("#file-name");
    folderSelector = $("#open-file");
    eventViewer = echarts.init(document.getElementById('event-viewer'));
    eventInfo = $("#event-info");
    viewerSlider = $("#viewer-slider");
    playBtn = $("#play-button");
    eventViewer.setOption({
        animation: false,
        xAxis: {
            min: 0,
            max: getInputVal("#width") - 1,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        yAxis: {
            min: 0,
            max: getInputVal("#height") - 1,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        series: []
    });

    folderSelector.on("click", function (e) {
        window.electronAPI.openFile(function (res) {
            if (res["succeeded"]) {
                currentFile = res["file_name"];
                document.title = currentFile;
                pageTitle.text(currentFile);
                eventData = dataToTPYX(res["data"]);
                console.log(eventData);
                frameCount = Math.ceil(eventData[eventData.length - 1][0] / frameSize);
                viewerSlider.attr("max", frameCount + 1);
                currentFrame = 0;
                updateDisplay();
            }
        });
    });

    viewerSlider.on("input propertychange", function (e) {
        currentFrame = parseInt(viewerSlider.val()) - 1;
        updateDisplay();
    });

    $(window).on("resize", function () {
        eventViewer.resize();
    });

    playBtn.on("click", function (e) {
        playEvent = !playEvent;
        playBtn.find("i").html(playEvent ? "pause" : "play_arrow");
        if (playEvent) {
            play(currentFrame);
        }
    });
});