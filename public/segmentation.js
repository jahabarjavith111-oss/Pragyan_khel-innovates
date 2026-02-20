let selfieSegmentation = null;
let segmentationReady = false;
let segmentationCanvas = null;
let segmentationCtx = null;

async function initSegmentation() {
    if (selfieSegmentation) return selfieSegmentation;
    
    try {
        console.log('Initializing MediaPipe Selfie Segmentation...');
        
        selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.4.1633559619/${file}`;
            }
        });
        
        selfieSegmentation.setOptions({
            model: 'general',
            smoothSegmentation: true,
            enableSegmentation: true,
            smoothEdges: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        return new Promise((resolve, reject) => {
            selfieSegmentation.onResults((results) => {
                segmentationReady = true;
                resolve(results);
            });
            
            selfieSegmentation.initialize()
                .then(() => {
                    console.log('MediaPipe Selfie Segmentation ready');
                    segmentationCanvas = document.createElement('canvas');
                    segmentationCtx = segmentationCanvas.getContext('2d', {
                        willReadFrequently: true,
                        alpha: true
                    });
                    updateStatus('mp', 'loaded');
                })
                .catch(reject);
        });
    } catch (error) {
        console.error('Failed to initialize segmentation:', error);
        updateStatus('mp', 'error');
        throw error;
    }
}

async function segmentPerson(video) {
    if (!selfieSegmentation || !segmentationReady) {
        return null;
    }
    
    try {
        await selfieSegmentation.send({ image: video });
        return selfieSegmentation.result;
    } catch (error) {
        return null;
    }
}

function createMaskFromSegmentation(segmentationResult, width, height) {
    if (!segmentationResult || !segmentationResult.segmentationMask) {
        return null;
    }
    
    if (!segmentationCanvas || segmentationCanvas.width !== width || segmentationCanvas.height !== height) {
        segmentationCanvas.width = width;
        segmentationCanvas.height = height;
    }
    
    const mask = segmentationResult.segmentationMask;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    
    const imageData = maskCtx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < mask.length; i++) {
        const value = mask[i];
        const idx = i * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = value > 0.5 ? 255 : 0;
    }
    
    maskCtx.putImageData(imageData, 0, 0);
    
    return maskCanvas;
}

function applyBlurWithSegmentation(
    ctx,
    video,
    trackedBbox,
    blurAmount,
    segmentationResult,
    videoWidth,
    videoHeight
) {
    const [x, y, w, h] = trackedBbox;
    
    const padding = Math.max(w, h) * 0.15;
    const clipX = Math.max(0, x - padding);
    const clipY = Math.max(0, y - padding);
    const clipW = Math.min(videoWidth - clipX, w + padding * 2);
    const clipH = Math.min(videoHeight - clipY, h + padding * 2);
    
    ctx.save();
    
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.filter = 'none';
    
    if (segmentationResult && segmentationResult.segmentationMask) {
        const maskCanvas = createMaskFromSegmentation(segmentationResult, videoWidth, videoHeight);
        
        if (maskCanvas) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, clipY, clipW, clipH);
            ctx.clip();
            
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
            
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskCanvas, 0, 0, videoWidth, videoHeight);
            ctx.restore();
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, clipY, clipW, clipH);
            ctx.clip();
            
            ctx.globalCompositeOperation = 'destination-over';
            ctx.filter = `blur(${Math.max(blurAmount - 5, 0)}px)`;
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, clipY, clipW, clipH);
            ctx.clip();
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
        }
    } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        ctx.restore();
    }
    
    ctx.restore();
}

function isSegmentationReady() {
    return segmentationReady;
}
