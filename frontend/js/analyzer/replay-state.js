function clampReplayTime(time, totalDuration) {
    return Math.max(0, Math.min(time, totalDuration));
}

function getReplayProgressPercent(currentTime, totalDuration) {
    return totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
}

function getCurrentPointIndex(points, currentTime) {
    if (!points || points.length === 0) {
        return 0;
    }

    const startTime = points[0].timeS;
    const currentAbsTime = startTime + currentTime;
    let currentPointIndex = 0;

    for (let i = 0; i < points.length; i++) {
        if (points[i].timeS <= currentAbsTime) {
            currentPointIndex = i;
        } else {
            break;
        }
    }

    return currentPointIndex;
}

function getAircraftPositionAtReplayTime(points, heights, currentTime) {
    const startTime = points[0].timeS;
    const currentAbsTime = startTime + currentTime;

    let prevIndex = 0;
    for (let i = 0; i < points.length - 1; i++) {
        if (points[i].timeS <= currentAbsTime && points[i + 1].timeS > currentAbsTime) {
            prevIndex = i;
            break;
        }
        if (i === points.length - 2) {
            prevIndex = points.length - 1;
        }
    }

    const nextIndex = Math.min(prevIndex + 1, points.length - 1);

    if (prevIndex === nextIndex) {
        return {
            index: prevIndex,
            lon: points[prevIndex].lon,
            lat: points[prevIndex].lat,
            alt: heights ? heights[prevIndex] : points[prevIndex].altM
        };
    }

    const t1 = points[prevIndex].timeS;
    const t2 = points[nextIndex].timeS;
    const t = (currentAbsTime - t1) / (t2 - t1);
    const alt1 = heights ? heights[prevIndex] : points[prevIndex].altM;
    const alt2 = heights ? heights[nextIndex] : points[nextIndex].altM;

    return {
        index: prevIndex,
        lon: points[prevIndex].lon + t * (points[nextIndex].lon - points[prevIndex].lon),
        lat: points[prevIndex].lat + t * (points[nextIndex].lat - points[prevIndex].lat),
        alt: alt1 + t * (alt2 - alt1)
    };
}

function getReplayTimeLabel(currentTime, totalDuration, formatReplayTime) {
    return `${formatReplayTime(currentTime)} / ${formatReplayTime(totalDuration)}`;
}

if (typeof window !== 'undefined') {
    window.clampReplayTime = clampReplayTime;
    window.getReplayProgressPercent = getReplayProgressPercent;
    window.getCurrentReplayPointIndex = getCurrentPointIndex;
    window.getAircraftPositionAtReplayTime = getAircraftPositionAtReplayTime;
    window.getReplayTimeLabel = getReplayTimeLabel;
}

export {
    clampReplayTime,
    getAircraftPositionAtReplayTime,
    getCurrentPointIndex,
    getReplayProgressPercent,
    getReplayTimeLabel
};
