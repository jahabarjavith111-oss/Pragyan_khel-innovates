# AI Smart Auto Focus & Dynamic Subject Tracking System

A production-ready full-stack web application that implements real-time AI-based subject detection, tracking, and background blur using only browser-based processing.

## Features

- **Upload Video or Start Webcam** - Choose between uploading an MP4 file or using your webcam
- **Click-to-Select** - Click on any detected subject to lock focus onto it
- **Real-time Tracking** - IoU-based object tracking with predictive motion
- **Dynamic Background Blur** - Keep selected subject sharp while blurring the background
- **Instant Focus Switching** - Click on a different subject to instantly switch focus
- **Video Recording** - Record and download the processed output
- **Performance Controls** - Adjustable blur intensity, detection frequency, and confidence threshold

## Tech Stack

### Frontend
- HTML5, CSS3
- Vanilla JavaScript (ES6 modules)
- TensorFlow.js (WebGL backend)
- MediaPipe Selfie Segmentation
- Canvas API
- MediaRecorder API

### Backend
- Node.js
- Express.js
- Multer (file uploads)

## Architecture

### AI Pipeline

#### 1. Object Detection
- Uses COCO-SSD model via TensorFlow.js
- Runs on WebGL backend for GPU acceleration
- Detection runs every N frames (configurable, default: 5)
- Filters detections by confidence threshold

#### 2. Click Selection
- Video frame rendered to canvas
- Mouse click coordinates mapped to video coordinates
- Detects which bounding box contains the click
- Locks selected object ID for continuous tracking

#### 3. Object Tracking (IoU-based)
- **Intersection over Union (IoU)** tracking algorithm
- Matches current detections with previous bounding box
- Uses 0.3 IoU threshold for matching
- Falls back to position prediction when detection is lost
- Maintains tracking history for smooth motion prediction

#### 4. Segmentation
- Uses MediaPipe Selfie Segmentation model
- Generates person mask for precise subject isolation
- Combined with bounding box for refined subject region

#### 5. Background Blur
- Creates blurred version of entire frame
- Clips sharp region for selected subject
- Composites sharp subject over blurred background
- Adjustable blur intensity (0-50px)

### Video Processing Loop

```
requestAnimationFrame loop:
  1. Draw video frame to hidden canvas
  2. Run detection (every N frames)
  3. Run tracking update
  4. Run segmentation (continuous)
  5. Apply blur composite
  6. Render to visible canvas
  7. Update FPS counter
```

## Performance Optimization

- **Downscaled Detection**: Input scaled to 320x320 for faster inference
- **Adaptive Detection**: Runs detection every N frames, not every frame
- **Async/Await**: Proper async handling to avoid blocking UI thread
- **WebGL Backend**: GPU-accelerated TensorFlow operations
- **Segmentation Throttling**: Continuous segmentation but lightweight
- **RequestAnimationFrame**: Browser-optimized rendering loop

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Then open http://localhost:3000 in your browser.

## Project Structure

```
root/
├── server.js           # Express server
├── package.json       # Dependencies
├── README.md          # This file
└── public/
    ├── index.html     # Main HTML
    ├── style.css      # Styling
    ├── app.js         # Main application logic
    ├── detection.js   # COCO-SSD integration
    ├── tracking.js    # IoU-based tracker
    ├── segmentation.js # MediaPipe segmentation
    └── utils.js       # Helper functions
```

## How to Use

1. **Start the server**: `npm start`
2. **Open in browser**: http://localhost:3000
3. **Wait for AI models to load** (status indicators turn green)
4. **Upload a video** or **Start webcam**
5. **Click on a subject** in the video to track
6. Adjust blur intensity and other settings as needed
7. **Record** the processed output if desired

## Limitations

- **Browser-based**: All processing runs in-browser, requires modern browser with WebGL
- **COCO-SSD Classes**: Limited to 80 object classes (people, animals, vehicles, etc.)
- **Performance**: Depends on device GPU capabilities
- **Lighting**: Detection accuracy affected by poor lighting
- **Occlusion**: Extended occlusion may cause tracking loss
- **Video Format**: Upload supports common formats (MP4, WebM)

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+ (with limited WebGL support)

## API Endpoints

### POST /api/save-video
Saves a recorded video to the server.

**Request**: Multipart form data with video file

**Response**:
```json
{
  "success": true,
  "message": "Video saved successfully",
  "filename": "video-1234567890.mp4",
  "path": "/uploads/video-1234567890.mp4"
}
```

### GET /api/videos
Lists all saved videos.

**Response**:
```json
[
  { "name": "video-123.mp4", "path": "/uploads/video-123.mp4" }
]
```

## License

MIT
