function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

class FPSCounter {
    constructor() {
        this.frames = [];
        this.lastTime = performance.now();
    }
    
    update() {
        const now = performance.now();
        this.frames.push(now);
        
        while (this.frames.length > 0 && this.frames[0] <= now - 1000) {
            this.frames.shift();
        }
        
        return this.frames.length;
    }
    
    getFPS() {
        return this.frames.length;
    }
}

function drawBoundingBox(ctx, bbox, options = {}) {
    const {
        color = '#6366f1',
        lineWidth = 2,
        selected = false,
        trackingLost = false,
        label = '',
        confidence = 0
    } = options;
    
    const [x, y, w, h] = bbox;
    
    ctx.save();
    
    if (trackingLost) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = lineWidth + 1;
    } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
    }
    
    ctx.strokeRect(x, y, w, h);
    
    if (selected || trackingLost) {
        ctx.shadowColor = trackingLost ? '#ef4444' : color;
        ctx.shadowBlur = 15;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;
    }
    
    if (label || confidence > 0) {
        const text = label + (confidence > 0 ? ` ${Math.round(confidence * 100)}%` : '');
        
        const textWidth = ctx.measureText(text).width + 12;
        const textHeight = 20;
        
        ctx.fillStyle = trackingLost ? '#ef4444' : color;
        ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(text, x + 6, y - 5);
    }
    
    if (selected) {
        const cornerLength = 20;
        const cornerWidth = 3;
        
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = cornerWidth;
        
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLength);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLength, y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLength, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerLength);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + w, y + h - cornerLength);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - cornerLength, y + h);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + cornerLength, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h - cornerLength);
        ctx.stroke();
    }
    
    ctx.restore();
}

function mapToVideoCoordinates(clickX, clickY, canvasRect, videoWidth, videoHeight) {
    const scaleX = videoWidth / canvasRect.width;
    const scaleY = videoHeight / canvasRect.height;
    
    return {
        x: (clickX - canvasRect.left) * scaleX,
        y: (clickY - canvasRect.top) * scaleY
    };
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function saveVideoToServer(blob) {
    const formData = new FormData();
    formData.append('video', blob, 'processed-video.webm');
    
    try {
        const response = await fetch('/api/save-video', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to save video:', error);
        throw error;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function updateStatus(elementId, status) {
    const element = document.getElementById(`status-${elementId}`);
    if (!element) return;
    
    element.classList.remove('loaded', 'loading', 'error');
    
    if (status === 'loaded') {
        element.classList.add('loaded');
    } else if (status === 'loading') {
        element.classList.add('loading');
    } else if (status === 'error') {
        element.classList.add('error');
    }
}
