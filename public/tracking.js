const IOU_THRESHOLD = 0.3;
const TRACKING_LOST_THRESHOLD = 30;

class ObjectTracker {
    constructor() {
        this.trackedObject = null;
        this.previousBbox = null;
        this.frameCount = 0;
        this.trackingLostFrames = 0;
        this.isTracking = false;
        this.trackingHistory = [];
    }
    
    calculateIoU(bbox1, bbox2) {
        const [x1, y1, w1, h1] = bbox1;
        const [x2, y2, w2, h2] = bbox2;
        
        const xLeft = Math.max(x1, x2);
        const yTop = Math.max(y1, y2);
        const xRight = Math.min(x1 + w1, x2 + w2);
        const yBottom = Math.min(y1 + h1, y2 + h2);
        
        if (xRight < xLeft || yBottom < yTop) {
            return 0;
        }
        
        const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
        const bbox1Area = w1 * h1;
        const bbox2Area = w2 * h2;
        const unionArea = bbox1Area + bbox2Area - intersectionArea;
        
        return intersectionArea / unionArea;
    }
    
    findMatchingDetection(detections, previousBbox) {
        if (!previousBbox || detections.length === 0) {
            return null;
        }
        
        let bestMatch = null;
        let bestIoU = 0;
        
        for (const detection of detections) {
            const iou = this.calculateIoU(previousBbox, detection.bbox);
            if (iou > bestIoU && iou >= IOU_THRESHOLD) {
                bestIoU = iou;
                bestMatch = detection;
            }
        }
        
        return bestMatch;
    }
    
    selectObject(detections, clickX, clickY, videoWidth, videoHeight) {
        for (const detection of detections) {
            const [x, y, w, h] = detection.bbox;
            
            const scaleX = videoWidth / (this.lastVideoWidth || videoWidth);
            const scaleY = videoHeight / (this.lastVideoHeight || videoHeight);
            
            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledW = w * scaleX;
            const scaledH = h * scaleY;
            
            if (clickX >= scaledX && clickX <= scaledX + scaledW &&
                clickY >= scaledY && clickY <= scaledY + scaledH) {
                
                this.trackedObject = {
                    ...detection,
                    bbox: [scaledX, scaledY, scaledW, scaledH],
                    selectedAt: Date.now()
                };
                this.previousBbox = [scaledX, scaledY, scaledW, scaledH];
                this.isTracking = true;
                this.trackingLostFrames = 0;
                this.trackingHistory = [];
                
                return this.trackedObject;
            }
        }
        
        return null;
    }
    
    update(detections, forceDetect = false) {
        this.frameCount++;
        
        if (!this.trackedObject) {
            return null;
        }
        
        if (forceDetect || detections.length > 0) {
            const matched = this.findMatchingDetection(detections, this.previousBbox);
            
            if (matched) {
                this.trackedObject = {
                    ...matched,
                    bbox: matched.bbox,
                    lastSeen: Date.now()
                };
                this.previousBbox = matched.bbox;
                this.trackingLostFrames = 0;
                this.isTracking = true;
                
                this.trackingHistory.push({
                    bbox: [...matched.bbox],
                    timestamp: Date.now()
                });
                
                if (this.trackingHistory.length > 30) {
                    this.trackingHistory.shift();
                }
                
                return this.trackedObject;
            }
        }
        
        this.trackingLostFrames++;
        
        if (this.trackingLostFrames > TRACKING_LOST_THRESHOLD) {
            this.isTracking = false;
        }
        
        const predictedBbox = this.predictNextPosition();
        if (predictedBbox) {
            this.trackedObject = {
                ...this.trackedObject,
                bbox: predictedBbox,
                predicted: true
            };
            this.previousBbox = predictedBbox;
        }
        
        return this.trackedObject;
    }
    
    predictNextPosition() {
        if (this.trackingHistory.length < 2) {
            return this.previousBbox;
        }
        
        const recent = this.trackingHistory.slice(-5);
        
        let dx = 0, dy = 0;
        
        for (let i = 1; i < recent.length; i++) {
            dx += recent[i].bbox[0] - recent[i-1].bbox[0];
            dy += recent[i].bbox[1] - recent[i-1].bbox[1];
        }
        
        dx /= (recent.length - 1);
        dy /= (recent.length - 1);
        
        const velocityFactor = Math.min(this.trackingLostFrames * 0.1, 1);
        
        const [x, y, w, h] = this.previousBbox;
        
        return [
            x + dx * velocityFactor,
            y + dy * velocityFactor,
            w,
            h
        ];
    }
    
    getTrackedObject() {
        return this.trackedObject;
    }
    
    isCurrentlyTracking() {
        return this.isTracking && this.trackedObject !== null;
    }
    
    hasLostTracking() {
        return this.trackingLostFrames > TRACKING_LOST_THRESHOLD / 2;
    }
    
    reset() {
        this.trackedObject = null;
        this.previousBbox = null;
        this.frameCount = 0;
        this.trackingLostFrames = 0;
        this.isTracking = false;
        this.trackingHistory = [];
    }
    
    setVideoDimensions(width, height) {
        this.lastVideoWidth = width;
        this.lastVideoHeight = height;
    }
}
