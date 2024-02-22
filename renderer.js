/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
var pageTitle, folderSelector, eventViewer, viewerSlider, playBtn;

var currentFile = "";
var eventData = [];
var frameSize = 5000;
var frameCount = 1;
var playEvent = false;
var currentFrame = 0;

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
    pageTitle = $("#file-name");
    folderSelector = $("#open-file");
    eventViewer = echarts.init(document.getElementById('event-viewer'));
    viewerSlider = $("#viewer-slider");
    playBtn = $("#play-button");
    eventViewer.setOption({
        animation: false,
        xAxis: {
            min: 0,
            max: 1279,
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            }
        },
        yAxis: {
            min: 0,
            max: 799,
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
            if (res["data"].length) {
                currentFile = res["file_name"];
                document.title = currentFile;
                pageTitle.text(currentFile);
                eventData = res["data"];
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