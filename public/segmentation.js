let segmentationReady = false;

async function initSegmentation() {
    segmentationReady = true;
    console.log('Segmentation ready (simplified mode)');
    updateStatus('mp', 'loaded');
    return true;
}

async function segmentPerson(video) {
    return null;
}

function createMaskFromSegmentation(segmentationResult, width, height) {
    return null;
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
    
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iw = Math.round(w);
    const ih = Math.round(h);
    
    ctx.save();
    
    if (blurAmount > 0) {
        ctx.filter = `blur(${blurAmount}px)`;
    }
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.filter = 'none';
    
    ctx.drawImage(video, ix, iy, iw, ih, ix, iy, iw, ih);
    
    ctx.restore();
}

function isSegmentationReady() {
    return segmentationReady;
}
