// =============================================================
// Open Stage Control Custom Module for AbletonOSC
// Load with: --custom-module /Users/audionoise/Desktop/ableton_module.js
// =============================================================

var trackNames = {};
var trackColors = {};
var NUM_TRACKS = 8;
var NUM_SCENES = 8;
var currentlyPlaying = {};

// ---- Bank offsets ----
var trackOffset = 0;
var sceneOffset = 0;

// ---- Totals from Ableton (prevent out-of-bounds) ----
var totalTracks = 999;
var totalScenes = 999;

// ---- Color Filter ----
// Pass Ableton's raw color ints directly, but ensure a balanced opacity is applied later.
function enhanceColor(colorInt) {
    if (typeof colorInt !== 'number' || colorInt <= 0) return 'rgba(40,40,40,1)';

    // Extract true RGB 0-255 exactly as provided by Ableton 11
    var r = (colorInt >> 16) & 255;
    var g = (colorInt >> 8) & 255;
    var b = colorInt & 255;

    return 'rgba(' + r + ',' + g + ',' + b + ', 1)';
}

// ---- Sync: Request clip names & colors for visible bank ----
function requestSync() {
    for (var t = 0; t < NUM_TRACKS; t++) {
        var realTrack = trackOffset + t;
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/track/get/clips/name',
            args: [{ type: 'i', value: realTrack }]
        });
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/track/get/clips/color',
            args: [{ type: 'i', value: realTrack }]
        });
    }

    // Also fetch scene names for the scene launch column
    for (var s = 0; s < NUM_SCENES; s++) {
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/scene/get/name',
            args: [{ type: 'i', value: sceneOffset + s }]
        });
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/scene/get/color',
            args: [{ type: 'i', value: sceneOffset + s }]
        });
    }
}

// ---- Subscribe to playing_slot_index for visible tracks ----
function subscribePlayback() {
    for (var t = 0; t < NUM_TRACKS; t++) {
        var realTrack = trackOffset + t;
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/track/start_listen/playing_slot_index',
            args: [{ type: 'i', value: realTrack }]
        });
    }
}

// ---- Unsubscribe from old tracks before bank change ----
function unsubscribePlayback() {
    for (var t = 0; t < NUM_TRACKS; t++) {
        var realTrack = trackOffset + t;
        sendOsc({
            host: '127.0.0.1', port: 11000,
            address: '/live/track/stop_listen/playing_slot_index',
            args: [{ type: 'i', value: realTrack }]
        });
    }
}

// ---- Apply clip names + colors for a given real track ----
function applyTrack(realTrackId) {
    var names = trackNames[realTrackId];
    var colors = trackColors[realTrackId];
    if (!names || !colors) return;

    // Map real track to grid column
    var col = realTrackId - trackOffset;
    if (col < 0 || col >= NUM_TRACKS) {
        delete trackNames[realTrackId];
        delete trackColors[realTrackId];
        return;
    }

    for (var c = 0; c < NUM_SCENES; c++) {
        var realScene = sceneOffset + c;
        var btnId = 'clip_' + col + '_' + c;
        var name = (realScene < names.length) ? names[realScene] : null;
        var color = (realScene < colors.length) ? colors[realScene] : null;

        var props = {};

        if (name !== null && name !== undefined && name !== '' && String(name) !== 'null') {
            props.label = String(name);
        } else {
            props.label = '';
        }

        props.colorFill = enhanceColor(color);
        props.alphaFillOff = 0.65; // Balanced opacity so text is readable but color is cohesive

        receiveOsc({
            address: '/EDIT/MERGE',
            args: [
                { type: 's', value: btnId },
                { type: 's', value: JSON.stringify(props) }
            ]
        });
    }

    delete trackNames[realTrackId];
    delete trackColors[realTrackId];
}

// stateless routing removed remapButtons() requirement

// ---- Highlight playing clip ----
function updatePlayingState(realTrackId, slotIndex) {
    var col = realTrackId - trackOffset;
    if (col < 0 || col >= NUM_TRACKS) return;

    var prevSlot = currentlyPlaying[realTrackId];
    var prevRow = (prevSlot !== undefined) ? prevSlot - sceneOffset : -1;
    var newRow = slotIndex - sceneOffset;

    if (prevRow >= 0 && prevRow < NUM_SCENES) {
        receiveOsc({
            address: '/EDIT/MERGE',
            args: [
                { type: 's', value: 'clip_' + col + '_' + prevRow },
                { type: 's', value: JSON.stringify({ css: 'font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px black;' }) }
            ]
        });
    }

    if (newRow >= 0 && newRow < NUM_SCENES) {
        receiveOsc({
            address: '/EDIT/MERGE',
            args: [
                { type: 's', value: 'clip_' + col + '_' + newRow },
                {
                    type: 's', value: JSON.stringify({
                        css: 'font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px black; box-shadow: inset 0 0 0 3px #0f0;'
                    })
                }
            ]
        });
    }

    currentlyPlaying[realTrackId] = slotIndex;
}

// ---- Clear all visual highlights from the grid ----
function clearAllHighlights() {
    for (var t = 0; t < NUM_TRACKS; t++) {
        for (var s = 0; s < NUM_SCENES; s++) {
            receiveOsc({
                address: '/EDIT/MERGE',
                args: [
                    { type: 's', value: 'clip_' + t + '_' + s },
                    { type: 's', value: JSON.stringify({ css: 'font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px black;' }) }
                ]
            });
        }
    }
}

// ---- Handle bank navigation ----
function navigate(type, delta) {
    if (type === 'track') {
        var newOffset = trackOffset + delta;
        if (newOffset < 0) newOffset = 0;
        // Clamp: don't scroll past the last track
        var maxTrackOffset = Math.max(0, totalTracks - NUM_TRACKS);
        if (newOffset > maxTrackOffset) newOffset = maxTrackOffset;
        if (newOffset === trackOffset) return; // No change
        unsubscribePlayback();
        trackOffset = newOffset;
        currentlyPlaying = {};
    } else if (type === 'scene') {
        var newOffset = sceneOffset + delta;
        if (newOffset < 0) newOffset = 0;
        // Clamp: don't scroll past the last scene
        var maxSceneOffset = Math.max(0, totalScenes - NUM_SCENES);
        if (newOffset > maxSceneOffset) newOffset = maxSceneOffset;
        if (newOffset === sceneOffset) return; // No change
        sceneOffset = newOffset;
    }

    // Clear stuck green borders, re-sync, resubscribe
    clearAllHighlights();
    requestSync();
    subscribePlayback();
}

// =============================================================
module.exports = {

    init: function () {
        console.log('AbletonOSC Custom Module loaded.');
        setTimeout(function () {
            // Query how many tracks and scenes exist
            sendOsc({
                host: '127.0.0.1', port: 11000,
                address: '/live/song/get/num_tracks',
                args: []
            });
            sendOsc({
                host: '127.0.0.1', port: 11000,
                address: '/live/song/get/num_scenes',
                args: []
            });
            console.log('Ableton touchlive bridge initialized.');
        }, 500);
    },

    oscInFilter: function (data) {
        var address = data.address;

        // ---- Phase 3: Clip Names ----
        if (address === '/live/track/get/clips/name') {
            var id = data.args[0].value;
            trackNames[id] = [];
            for (var i = 1; i < data.args.length; i++) {
                trackNames[id].push(data.args[i].value);
            }
            applyTrack(id);
            return;
        }

        // ---- Phase 3: Clip Colors ----
        if (address === '/live/track/get/clips/color') {
            var id = data.args[0].value;
            trackColors[id] = [];
            for (var i = 1; i < data.args.length; i++) {
                trackColors[id].push(data.args[i].value);
            }
            applyTrack(id);
            return;
        }

        // ---- Phase 4: Playing Slot Index ----
        if (address === '/live/track/get/playing_slot_index') {
            var trackId = data.args[0].value;
            var slotIndex = data.args[1].value;
            updatePlayingState(trackId, slotIndex);
            return;
        }

        // ---- Track/Scene count (for clamping navigation) ----
        if (address === '/live/song/get/num_tracks') {
            totalTracks = data.args[0].value;
            console.log('Total tracks: ' + totalTracks);
            return;
        }
        if (address === '/live/song/get/num_scenes') {
            totalScenes = data.args[0].value;
            console.log('Total scenes: ' + totalScenes);
            return;
        }

        // ---- Phase 5: Scene Names ----
        if (address === '/live/scene/get/name') {
            var sceneId = data.args[0].value;
            var sceneName = data.args[1].value;
            var row = sceneId - sceneOffset;
            if (row >= 0 && row < NUM_SCENES) {
                receiveOsc({
                    address: '/EDIT/MERGE',
                    args: [
                        { type: 's', value: 'scene_' + row },
                        { type: 's', value: JSON.stringify({ label: '▶ ' + String(sceneName) }) }
                    ]
                });
            }
            return;
        }

        // ---- Phase 5: Scene Colors ----
        if (address === '/live/scene/get/color') {
            var sceneId = data.args[0].value;
            var sceneColor = data.args[1].value;
            var row = sceneId - sceneOffset;
            if (row >= 0 && row < NUM_SCENES) {
                receiveOsc({
                    address: '/EDIT/MERGE',
                    args: [
                        { type: 's', value: 'scene_' + row },
                        { type: 's', value: JSON.stringify({ colorFill: enhanceColor(sceneColor), alphaFillOff: 0.65 }) }
                    ]
                });
            }
            return;
        }

        return data;
    },

    // ---- Intercept outgoing commands before they reach Ableton ----
    oscOutFilter: function (data) {
        if (data.address === '/nav/track') {
            var delta = data.args[0].value;
            navigate('track', delta);
            return; // Block from going to Ableton
        }
        if (data.address === '/nav/scene') {
            var delta = data.args[0].value;
            navigate('scene', delta);
            return; // Block from going to Ableton
        }

        // ---- Stateless Routing Interception ----
        if (data.address === '/custom/fire_clip') {
            var relX = data.args[0].value;
            var relY = data.args[1].value;
            var realTrack = trackOffset + relX;
            var realScene = sceneOffset + relY;
            sendOsc({
                host: '127.0.0.1', port: 11000,
                address: '/live/clip_slot/fire',
                args: [{ type: 'i', value: realTrack }, { type: 'i', value: realScene }]
            });
            return;
        }

        if (data.address === '/custom/fire_scene') {
            var relY = data.args[0].value;
            var realScene = sceneOffset + relY;
            sendOsc({
                host: '127.0.0.1', port: 11000,
                address: '/live/scene/fire',
                args: [{ type: 'i', value: realScene }]
            });
            return;
        }

        if (data.address === '/custom/stop_track') {
            var relX = data.args[0].value;
            var realTrack = trackOffset + relX;
            sendOsc({
                host: '127.0.0.1', port: 11000,
                address: '/live/track/stop_all_clips',
                args: [{ type: 'i', value: realTrack }]
            });
            return;
        }

        if (data.address === '/custom/sync') {
            requestSync();
            subscribePlayback();
            return;
        }

        return data; // Forward everything else normally
    }
};
