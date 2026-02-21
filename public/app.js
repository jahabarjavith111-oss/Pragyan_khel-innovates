class SmartFocusApp {
    constructor() {
        this.video = null;
        this.mainCanvas = null;
        this.hiddenCanvas = null;
        this.mainCtx = null;
        this.hiddenCtx = null;
        
        this.objectTracker = new ObjectTracker();
        this.fpsCounter = new FPSCounter();
        
        this.isProcessing = false;
        this.isPaused = false;
        this.animationId = null;
        
        this.settings = {
            blurIntensity: 20,
            detectionInterval: 5,
            confidenceThreshold: 0.5,
            enableTracking: true,
            enableSegmentation: true,
            enableLowLight: false,
            enableLongRange: false
        };
        
        this.currentDetections = [];
        this.segmentationResult = null;
        this.frameCount = 0;
        
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadAI();
    }
    
    setupCanvas() {
        this.mainCanvas = document.getElementById('main-canvas');
        this.hiddenCanvas = document.getElementById('hidden-canvas');
        this.mainCtx = this.mainCanvas.getContext('2d', { alpha: false });
        this.hiddenCtx = this.hiddenCanvas.getContext('2d', { alpha: false });
    }
    
    setupEventListeners() {
        document.getElementById('btn-upload').addEventListener('click', () => {
            document.getElementById('video-input').click();
        });
        
        document.getElementById('video-input').addEventListener('change', (e) => {
            this.handleVideoUpload(e);
        });
        
        document.getElementById('btn-webcam').addEventListener('click', () => {
            this.startWebcam();
        });
        
        document.getElementById('blur-intensity').addEventListener('input', (e) => {
            this.settings.blurIntensity = parseInt(e.target.value);
            document.getElementById('blur-value').textContent = `${this.settings.blurIntensity}px`;
        });
        
        document.getElementById('detection-interval').addEventListener('input', (e) => {
            this.settings.detectionInterval = parseInt(e.target.value);
            document.getElementById('detection-value').textContent = `${this.settings.detectionInterval} frames`;
        });
        
        document.getElementById('confidence-threshold').addEventListener('input', (e) => {
            this.settings.confidenceThreshold = parseInt(e.target.value) / 100;
            document.getElementById('confidence-threshold-value').textContent = `${e.target.value}%`;
        });
        
        document.getElementById('enable-tracking').addEventListener('change', (e) => {
            this.settings.enableTracking = e.target.checked;
        });
        
        document.getElementById('enable-segmentation').addEventListener('change', (e) => {
            this.settings.enableSegmentation = e.target.checked;
        });
        
        document.getElementById('enable-low-light').addEventListener('change', (e) => {
            this.settings.enableLowLight = e.target.checked;
            if (this.settings.enableLowLight) {
                this.settings.confidenceThreshold = 0.3;
                this.settings.detectionInterval = 1;
                document.getElementById('confidence-threshold').value = 30;
                document.getElementById('confidence-threshold-value').textContent = '30%';
                document.getElementById('detection-interval').value = 1;
                document.getElementById('detection-value').textContent = '1 frame';
            }
        });
        
        document.getElementById('enable-long-range').addEventListener('change', (e) => {
            this.settings.enableLongRange = e.target.checked;
            if (this.settings.enableLongRange) {
                this.settings.confidenceThreshold = 0.25;
                this.settings.detectionInterval = 1;
                document.getElementById('confidence-threshold').value = 25;
                document.getElementById('confidence-threshold-value').textContent = '25%';
                document.getElementById('detection-interval').value = 1;
                document.getElementById('detection-value').textContent = '1 frame';
            }
        });
        
        document.getElementById('btn-record').addEventListener('click', () => {
            this.toggleRecording();
        });
        
        document.getElementById('btn-download').addEventListener('click', () => {
            this.downloadRecording();
        });
        
        this.mainCanvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            });
        });
    }
    
    loadAI() {
        const loadingText = document.getElementById('loading-text');
        
        if (typeof tf === 'undefined' || typeof cocoSsd === 'undefined') {
            loadingText.textContent = 'Loading libraries...';
            setTimeout(() => this.loadAI(), 500);
            return;
        }
        
        loadingText.textContent = 'Loading AI model...';
        
        Promise.all([
            loadDetectionModel(),
            initSegmentation()
        ]).then(() => {
            updateStatus('tf', 'loaded');
            updateStatus('model', 'loaded');
            updateStatus('mp', 'loaded');
            this.hideLoading();
        }).catch(err => {
            console.error('Error:', err);
            loadingText.textContent = 'Error: ' + (err.message || 'Failed to load');
        });
    }
    
    hideLoading() {
        const overlay = document.getElementById('canvas-overlay');
        overlay.classList.add('hidden');
    }
    
    showLoading(message = 'Loading AI models...') {
        const overlay = document.getElementById('canvas-overlay');
        overlay.classList.remove('hidden');
        document.getElementById('loading-text').textContent = message;
    }
    
    handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.stopProcessing();
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        this.video = document.createElement('video');
        this.video.src = URL.createObjectURL(file);
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = false;
        this.video.loop = true;
        
        this.video.onloadedmetadata = () => {
            this.setupVideoCanvas();
            this.video.play().then(() => {
                this.startProcessing();
            });
        };
        
        this.video.onerror = (e) => {
            console.error('Video error:', e);
            alert('Failed to load video file');
        };
    }
    
    async startWebcam() {
        this.stopProcessing();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            if (this.video) {
                this.video.srcObject = null;
            }
            
            this.video = document.createElement('video');
            this.video.srcObject = stream;
            this.video.muted = true;
            this.video.playsInline = true;
            this.video.autoplay = true;
            
            this.video.onloadedmetadata = () => {
                this.video.play().then(() => {
                    this.setupVideoCanvas();
                    this.startProcessing();
                });
            };
            
            this.video.onerror = (e) => {
                console.error('Video error:', e);
                alert('Failed to load video stream');
            };
        } catch (error) {
            console.error('Failed to access webcam:', error);
            alert('Failed to access webcam. Please check permissions and make sure no other app is using the camera.');
        }
    }
    
    setupVideoCanvas() {
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        this.mainCanvas.width = videoWidth;
        this.mainCanvas.height = videoHeight;
        this.hiddenCanvas.width = videoWidth;
        this.hiddenCanvas.height = videoHeight;
        
        this.objectTracker.setVideoDimensions(videoWidth, videoHeight);
        
        const container = document.querySelector('.canvas-frame');
        if (container) {
            const containerWidth = container.clientWidth - 4;
            const containerHeight = Math.min(container.clientHeight, window.innerHeight - 200);
            
            const scale = Math.min(
                containerWidth / videoWidth,
                containerHeight / videoHeight,
                1
            );
            
            this.mainCanvas.style.width = `${videoWidth * scale}px`;
            this.mainCanvas.style.height = `${videoHeight * scale}px`;
        }
        
        if (this.settings.enableSegmentation && isSegmentationReady()) {
            this.runSegmentation();
        }
    }
    
    runSegmentation() {
        if (!this.video || !this.isProcessing || !this.settings.enableSegmentation) return;
        
        segmentPerson(this.video).then(result => {
            this.segmentationResult = result;
        }).catch(error => {
            console.error('Segmentation error:', error);
        });
        
        if (this.isProcessing) {
            setTimeout(() => this.runSegmentation(), 100);
        }
    }
    
    startProcessing() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.frameCount = 0;
        
        document.getElementById('click-hint').classList.add('visible');
        setTimeout(() => {
            document.getElementById('click-hint').classList.remove('visible');
        }, 3000);
        
        if (this.settings.enableSegmentation) {
            this.runSegmentation();
        }
        
        this.processFrame();
    }
    
    stopProcessing() {
        this.isProcessing = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        this.objectTracker.reset();
        this.currentDetections = [];
        
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    }
    
    async processFrame() {
        if (!this.isProcessing || this.video.paused) {
            if (this.isProcessing) {
                this.animationId = requestAnimationFrame(() => this.processFrame());
            }
            return;
        }
        
        const fps = this.fpsCounter.update();
        document.getElementById('fps-counter').textContent = fps;
        
        this.frameCount++;
        
        const needsDetection = this.frameCount % this.settings.detectionInterval === 0;
        
        if (needsDetection && isModelReady()) {
            try {
                this.currentDetections = await detectObjects(
                    this.video,
                    this.settings.confidenceThreshold,
                    this.settings.enableLowLight,
                    this.settings.enableLongRange
                );
            } catch (error) {
                console.error('Detection error:', error);
            }
        }
        
        let trackedObject = null;
        
        if (this.objectTracker.getTrackedObject()) {
            if (this.settings.enableTracking) {
                trackedObject = this.objectTracker.update(
                    this.currentDetections,
                    needsDetection
                );
            } else {
                trackedObject = this.objectTracker.getTrackedObject();
            }
        }
        
        this.render(trackedObject);
        
        if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            // Frames captured via captureStream
        }
        
        this.animationId = requestAnimationFrame(() => this.processFrame());
    }
    
    render(trackedObject) {
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        this.mainCtx.fillStyle = '#0a0a0f';
        this.mainCtx.fillRect(0, 0, videoWidth, videoHeight);
        
        if (trackedObject) {
            applyBlurWithSegmentation(
                this.mainCtx,
                this.video,
                trackedObject.bbox,
                this.settings.blurIntensity,
                this.segmentationResult,
                videoWidth,
                videoHeight
            );
            
            const trackingStatusEl = document.getElementById('tracking-status');
            const confidenceEl = document.getElementById('confidence-value');
            
            if (trackedObject.predicted) {
                trackingStatusEl.textContent = 'Predicting';
                trackingStatusEl.className = 'stat-badge-value status-tracking';
            } else {
                trackingStatusEl.textContent = 'Tracking';
                trackingStatusEl.className = 'stat-badge-value status-ready';
            }
            
            confidenceEl.textContent = trackedObject.confidence ? 
                `${Math.round(trackedObject.confidence * 100)}%` : '--';
            
            const hasLost = this.objectTracker.hasLostTracking();
            
            drawBoundingBox(this.mainCtx, trackedObject.bbox, {
                color: hasLost ? '#ef4444' : '#22c55e',
                selected: true,
                trackingLost: hasLost,
                label: trackedObject.class || 'Subject',
                confidence: trackedObject.confidence
            });
        } else {
            this.mainCtx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
            
            for (const detection of this.currentDetections) {
                drawBoundingBox(this.mainCtx, detection.bbox, {
                    color: '#6366f1',
                    label: detection.class,
                    confidence: detection.confidence
                });
            }
            
            const trackingStatusEl = document.getElementById('tracking-status');
            trackingStatusEl.textContent = this.objectTracker.getTrackedObject() ? 'Searching...' : 'Ready';
            trackingStatusEl.className = 'stat-badge-value';
            
            document.getElementById('confidence-value').textContent = '--';
        }
    }
    
    handleCanvasClick(event) {
        if (!this.video || !isModelReady()) return;
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const clickX = event.clientX;
        const clickY = event.clientY;
        
        const coords = mapToVideoCoordinates(
            clickX,
            clickY,
            rect,
            this.video.videoWidth,
            this.video.videoHeight
        );
        
        const selected = this.objectTracker.selectObject(
            this.currentDetections,
            coords.x,
            coords.y,
            this.video.videoWidth,
            this.video.videoHeight
        );
        
        if (selected) {
            document.getElementById('click-hint').textContent = `Tracking: ${selected.class}`;
            document.getElementById('click-hint').classList.add('visible');
            setTimeout(() => {
                document.getElementById('click-hint').classList.remove('visible');
            }, 2000);
        } else {
            document.getElementById('click-hint').textContent = 'No subject detected at this location';
            document.getElementById('click-hint').classList.add('visible');
            setTimeout(() => {
                document.getElementById('click-hint').classList.remove('visible');
            }, 2000);
        }
    }
    
    handleResize() {
        if (this.video && this.mainCanvas) {
            this.setupVideoCanvas();
        }
    }
    
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        this.recordedChunks = [];
        
        const stream = this.mainCanvas.captureStream(30);
        
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            document.getElementById('btn-download').disabled = this.recordedChunks.length === 0;
        };
        
        this.mediaRecorder.start(1000);
        this.isRecording = true;
        
        const recordBtn = document.getElementById('btn-record');
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = `
            <span class="record-btn-icon"></span>
            <span class="record-btn-text">Stop Recording</span>
        `;
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        this.isRecording = false;
        
        const recordBtn = document.getElementById('btn-record');
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = `
            <span class="record-btn-icon"></span>
            <span class="record-btn-text">Start Recording</span>
        `;
    }
    
    downloadRecording() {
        if (this.recordedChunks.length === 0) return;
        
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `smart-focus-${timestamp}.webm`;
        
        downloadBlob(blob, filename);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SmartFocusApp();
});
