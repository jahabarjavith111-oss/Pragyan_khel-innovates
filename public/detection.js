let cocoModel = null;
let modelReady = false;
let detectionCanvas = null;
let detectionCtx = null;

const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

async function loadDetectionModel() {
    if (cocoModel) return cocoModel;
    if (modelReady) return cocoModel;
    
    updateStatus('model', 'loading');
    
    try {
        console.log('Loading COCO-SSD...');
        
        cocoModel = await cocoSsd.load({
            base: 'lite_mobilenet_v2'
        });
        
        detectionCanvas = document.createElement('canvas');
        detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true });
        
        console.log('COCO-SSD ready!');
        modelReady = true;
        updateStatus('model', 'loaded');
        
        return cocoModel;
    } catch (error) {
        console.error('Model load error:', error);
        updateStatus('model', 'error');
        throw error;
    }
}

function enhanceImage(video, lowLight = false, longRange = false) {
    if (!detectionCanvas || !detectionCtx) {
        detectionCanvas = document.createElement('canvas');
        detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true });
    }
    
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    detectionCanvas.width = width;
    detectionCanvas.height = height;
    
    detectionCtx.drawImage(video, 0, 0, width, height);
    
    if (lowLight || longRange) {
        const imageData = detectionCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const brightness = lowLight ? 1.4 : 1.1;
        const contrast = lowLight ? 1.3 : 1.15;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, ((data[i] - 128) * contrast + 128) * brightness);
            data[i + 1] = Math.min(255, ((data[i + 1] - 128) * contrast + 128) * brightness);
            data[i + 2] = Math.min(255, ((data[i + 2] - 128) * contrast + 128) * brightness);
        }
        
        detectionCtx.putImageData(imageData, 0, 0);
    }
    
    return detectionCanvas;
}

async function detectObjects(video, confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD, lowLight = false, longRange = false) {
    if (!cocoModel || !modelReady) return [];
    
    try {
        const enhancedCanvas = enhanceImage(video, lowLight, longRange);
        
        const detections = await cocoModel.detect(enhancedCanvas);
        
        return detections
            .filter(d => d.score >= confidenceThreshold)
            .map(d => ({
                bbox: [d.bbox[0], d.bbox[1], d.bbox[2], d.bbox[3]],
                class: d.class,
                confidence: d.score,
                classId: d.classId
            }));
    } catch (error) {
        console.error('Detection error:', error);
        return [];
    }
}

function isModelReady() {
    return modelReady && cocoModel !== null;
}
