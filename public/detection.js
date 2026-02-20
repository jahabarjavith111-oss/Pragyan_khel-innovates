let cocoModel = null;
let modelReady = false;

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

async function detectObjects(video, confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD) {
    if (!cocoModel || !modelReady) return [];
    
    try {
        const detections = await cocoModel.detect(video);
        
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
