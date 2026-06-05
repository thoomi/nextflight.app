const WALKTHROUGH_SECTIONS = [
    { type: 'strength', icon: '✓', key: 'whatWentWell', color: 'text-green-600' },
    { type: 'improve', icon: '↑', key: 'whatToImprove', color: 'text-orange-600' },
    { type: 'safety', icon: '⚠️', key: 'safetyMindset', color: 'text-red-600' },
    { type: 'plan', icon: '🎯', key: 'nextFlightPlan', color: 'text-blue-600' }
];

function buildWalkthroughItems(coaching, analysis) {
    const items = [];

    WALKTHROUGH_SECTIONS.forEach((section) => {
        coaching[section.key].forEach((text) => {
            items.push({
                type: section.type,
                icon: section.icon,
                text,
                color: section.color,
                jumpTarget: detectJumpTarget(text, analysis)
            });
        });
    });

    return items;
}

function detectJumpTarget(text, analysis) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('first lift') || lowerText.includes('first thermal') || lowerText.includes('found lift quickly')) {
        if (analysis.segments && analysis.segments.length > 0) {
            return { type: 'thermal', index: 0 };
        }
    }

    if (lowerText.includes('strongest climb') || lowerText.includes('best') || lowerText.includes('centering')) {
        if (analysis.best) {
            const bestIndex = analysis.segments.findIndex((segment) =>
                segment.avgClimb === analysis.best.avgClimb && segment.maxClimb === analysis.best.maxClimb
            );
            if (bestIndex >= 0) {
                return { type: 'thermal', index: bestIndex };
            }
        }
    }

    if (lowerText.includes('speedbar')) {
        if (analysis.glides && analysis.glides.length > 0) {
            const speedbarGlide = analysis.glides.find((glide) => glide.speedbarOpportunity);
            if (speedbarGlide) {
                return { type: 'glide', index: analysis.glides.indexOf(speedbarGlide) };
            }
        }
    }

    if (lowerText.includes('glide') && (lowerText.includes('indirect') || lowerText.includes('efficiency'))) {
        if (analysis.glides && analysis.glides.length > 0) {
            const inefficientGlide = analysis.glides.find((glide) => glide.efficiency && glide.efficiency < 0.85);
            if (inefficientGlide) {
                return { type: 'glide', index: analysis.glides.indexOf(inefficientGlide) };
            }
        }
    }

    return { type: 'time', ratio: 0.3 };
}

export {
    buildWalkthroughItems,
    detectJumpTarget
};
