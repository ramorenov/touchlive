# TouchLive 🎛️

A professional, real-time responsive Ableton Live clip launcher interface designed for touchscreens (iPads, tablets, smartphones) built on top of Open Stage Control and AbletonOSC.

![TouchLive Interface Preview](./touchlive%20screenshot.png)

## ✨ Features
* **Responsive 8x8 Clip Matrix:** Built with flawless percentage-based geometry. The pads automatically morph to perfectly fit any screen dimension or orientation without clipping.
* **Bi-directional Auto-Sync:** Automatically queries your Ableton project on boot to fetch clip names, scene names, and colors.
* **Real-time Playback Tracking:** Visually highlights the exact clip currently looping/playing with a bright green border overlay.
* **Infinite Project Navigation:** Scroll vertically and horizontally through massive projects. The module queries your global `num_tracks` and `num_scenes` to rigorously prevent out-of-bounds scrolling or phantom UI duplicates.
* **Unified Minimalist Chrome:** Launch scenes, stop individual tracks, or stop all clips with a cohesive, dark-matte professional UI.

---

## 🛠️ Prerequisites

To run TouchLive, you need three components:
1. **Ableton Live** (11 or newer recommended)
2. **AbletonOSC**: A MIDI Remote Script that exposes Ableton's API over OSC. [Download here](https://github.com/nlesica/AbletonOSC)
3. **Open Stage Control**: The web server frontend. [Download here](https://openstagecontrol.ammd.net/download/)

---

## 🚀 Installation & Setup

### 1. Install AbletonOSC
1. Download the `AbletonOSC` repository.
2. Move the `AbletonOSC` folder into your Ableton User Library MIDI Remote Scripts folder:
   - **Mac:** `~/Music/Ableton/User Library/Remote Scripts/AbletonOSC`
   - **Windows:** `\Users\[Username]\Documents\Ableton\User Library\Remote Scripts\AbletonOSC`
3. Restart Ableton Live.
4. Go to **Preferences > Link/Tempo/MIDI** and select `AbletonOSC` in an empty Control Surface slot.

### 2. Configure Open Stage Control
To make the color processing and real-time syncing work, Open Stage Control **must** be launched with the custom javascript module included in this repository.

1. Open the Open Stage Control application (Launcher).
2. In the `load` field, browse and select the `touchlive_session.json` file from this repository.
3. In the `custom-module` field, browse and select the `touchlive_module.js` file.
4. Click the "Play" (Start) button.

*(If you are launching via terminal instead, use: `open-stage-control --load touchlive_session.json --custom-module touchlive_module.js`)*

### 3. Connect & Play
1. Open any browser on your iPad, Tablet, or mobile device connected to the same WiFi network.
2. Go to the IP address shown in Open Stage Control (e.g., `http://192.168.1.XX:8080`).
3. Press the **RE-SYNC** button in the top right corner if your Ableton Live set was already loaded.
4. Enjoy your custom touch controller! 

---

## 🔧 File Structure
* **`touchlive_session.json`**: The Open Stage Control GUI layout, built with native relative percentage bindings.
* **`touchlive_module.js`**: The brains of the operation. Intercepts AbletonOSC bulk arrays, performs the HSL Vibrance color correction, calculates project bounds, intercepts navigation bounds, and patches Open Stage Control's widget properties live.

---

## 📜 License
MIT License. Feel free to fork, modify, and build your ultimate custom Ableton controller.
