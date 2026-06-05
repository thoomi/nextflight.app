function renderThermalsList({
    thermals,
    container,
    cssClasses,
    formatters,
    onClearSelection,
    onMouseEnter,
    onMouseLeave,
    onSelect
}) {
    container.innerHTML = '';

    if (thermals.length === 0) {
        container.innerHTML = getEmptyStateHtml({
            iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
            title: 'No Thermals Detected',
            text: "This flight didn't have any detected thermal segments"
        });
        return;
    }

    const clearItem = document.createElement('div');
    clearItem.className = `${cssClasses.thermalItem} text-center`;
    clearItem.id = 'clearThermalSelection';
    clearItem.innerHTML = '<div class="text-xs text-slate-500 italic">No thermal selected</div>';
    clearItem.addEventListener('click', onClearSelection);
    container.appendChild(clearItem);

    thermals.forEach((thermal, index) => {
        const item = document.createElement('div');
        item.className = cssClasses.thermalItem;
        item.dataset.thermalIndex = index;
        item.innerHTML = getThermalItemHtml({
            thermal,
            index,
            cssClasses,
            formatVario: formatters.formatVario
        });

        item.addEventListener('mouseenter', () => onMouseEnter(index));
        item.addEventListener('mouseleave', onMouseLeave);
        item.addEventListener('click', () => onSelect(thermal, index));

        container.appendChild(item);
    });
}

function renderGlidesList({
    glides,
    container,
    cssClasses,
    formatters,
    onClearSelection,
    onMouseEnter,
    onMouseLeave,
    onSelect
}) {
    container.innerHTML = '';

    if (glides.length === 0) {
        container.innerHTML = getEmptyStateHtml({
            iconPath: 'M7 11l5-9 5 9M5 21h14',
            title: 'No Glides Detected',
            text: "This flight didn't have any detected glide segments"
        });
        return;
    }

    const clearItem = document.createElement('div');
    clearItem.className = `${cssClasses.thermalItem} text-center`;
    clearItem.id = 'clearGlideSelection';
    clearItem.innerHTML = '<div class="text-xs text-slate-500 italic">No glide selected</div>';
    clearItem.addEventListener('click', onClearSelection);
    container.appendChild(clearItem);

    glides.forEach((glide, index) => {
        const item = document.createElement('div');
        const meta = getGlideTypeMeta(glide);
        item.className = `${cssClasses.thermalItem} ${meta.backgroundColor}`;
        item.dataset.glideIndex = index;
        item.innerHTML = getGlideItemHtml({
            glide,
            index,
            meta,
            formatTime: formatters.formatTime,
            formatVario: formatters.formatVario
        });

        item.addEventListener('mouseenter', () => onMouseEnter(index));
        item.addEventListener('mouseleave', onMouseLeave);
        item.addEventListener('click', () => onSelect(glide, index));

        container.appendChild(item);
    });
}

function getThermalItemHtml({ thermal, index, cssClasses, formatVario }) {
    return `
        <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-medium text-slate-900">Thermal ${index + 1}</div>
            <div class="text-xs ${thermal.earlyExit ? 'text-orange-500' : 'text-green-600'}">
                ${thermal.earlyExit ? '⚠️ Early Exit' : '✓'}
            </div>
        </div>
        <div class="text-xs text-slate-600">
            <div class="${cssClasses.climbPositive}">${formatVario(thermal.maxClimb)} peak</div>
            <div class="text-slate-500">
                Avg: ${formatVario(thermal.avgClimb)} • ${thermal.circles.toFixed(1)} circles
            </div>
        </div>
    `;
}

function getGlideItemHtml({ glide, index, meta, formatTime, formatVario }) {
    let reasonsHtml = '';
    if (glide.speedbarReasons && glide.speedbarReasons.length > 0) {
        reasonsHtml = `<div class="text-xs text-slate-500 mt-1">${glide.speedbarReasons.join(', ')}</div>`;
    }

    return `
        <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-medium text-slate-900">Glide ${index + 1}</div>
            <div class="text-xs ${meta.typeColor}">
                ${meta.typeIcon} ${meta.typeLabel}
            </div>
        </div>
        <div class="text-xs text-slate-600">
            <div>
                ${glide.direction} • ${(glide.straightDistance / 1000).toFixed(2)} km
                ${glide.glideRatio ? ` • ${glide.glideRatio.toFixed(1)}:1` : ''}
            </div>
            <div class="text-slate-500">
                ${formatVario(glide.avgVario)} • ${formatTime(glide.durationS)}
            </div>
            ${reasonsHtml}
        </div>
    `;
}

function getGlideTypeMeta(glide) {
    if (glide.speedbarOpportunity && glide.speedbarWorthwhile) {
        return {
            typeColor: 'text-orange-600',
            backgroundColor: 'bg-orange-50',
            typeIcon: '⚡',
            typeLabel: 'Speedbar'
        };
    }

    if (glide.speedbarOpportunity) {
        return {
            typeColor: 'text-yellow-600',
            backgroundColor: 'bg-yellow-50',
            typeIcon: '⚡',
            typeLabel: 'Minor Speedbar'
        };
    }

    if (glide.glideType === 'soaring') {
        return {
            typeColor: 'text-green-600',
            backgroundColor: 'bg-green-50',
            typeIcon: '🪂',
            typeLabel: 'Ridge Soaring'
        };
    }

    if (glide.glideType === 'searching') {
        return {
            typeColor: 'text-purple-600',
            backgroundColor: 'bg-purple-50',
            typeIcon: '🔍',
            typeLabel: 'Searching'
        };
    }

    if (glide.glideRatio && glide.glideRatio < 6) {
        return {
            typeColor: 'text-red-600',
            backgroundColor: 'bg-red-50',
            typeIcon: '⚠️',
            typeLabel: 'Poor Glide'
        };
    }

    return {
        typeColor: 'text-slate-700',
        backgroundColor: 'bg-slate-100',
        typeIcon: '✈️',
        typeLabel: 'Normal'
    };
}

function getEmptyStateHtml({ iconPath, title, text }) {
    return `
        <div class="empty-state">
            <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
            </svg>
            <p class="empty-state-title">${title}</p>
            <p class="empty-state-text">${text}</p>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.renderThermalsList = renderThermalsList;
    window.renderGlidesList = renderGlidesList;
}

export {
    renderThermalsList,
    renderGlidesList,
    getGlideTypeMeta
};
