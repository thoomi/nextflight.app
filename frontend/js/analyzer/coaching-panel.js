import { generateCoaching } from '../core/flight-analyzer.js';

function renderCoachingPanel({
    analysis,
    domCache,
    ids,
    cssClasses,
    onStartWalkthrough
}) {
    const coaching = generateCoaching(analysis);
    const coachingHTML = generateCoachingHTML(coaching);

    domCache.get(ids.coachingTabContent).innerHTML = coachingHTML;
    updateCoachingTabBadge({
        badge: domCache.get(ids.coachingBadge),
        coaching,
        hiddenClass: cssClasses.hidden
    });

    queueMicrotask(() => {
        const startBtn = document.getElementById(ids.startWalkthroughBtn);
        if (startBtn) {
            startBtn.addEventListener('click', () => onStartWalkthrough(coaching));
        }
    });

    return coaching;
}

function updateCoachingTabBadge({ badge, coaching, hiddenClass }) {
    const totalCount = getCoachingItemCount(coaching);

    if (totalCount > 0) {
        badge.textContent = totalCount;
        badge.classList.remove(hiddenClass);
    } else {
        badge.classList.add(hiddenClass);
    }
}

function getCoachingItemCount(coaching) {
    return coaching.whatWentWell.length +
        coaching.whatToImprove.length +
        coaching.safetyMindset.length +
        coaching.nextFlightPlan.length;
}

function generateCoachingHTML(coaching) {
    const sections = [
        {
            title: '✓ Strengths',
            subtitle: 'What you did well',
            items: coaching.whatWentWell,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            icon: '✓'
        },
        {
            title: '↑ Growth Areas',
            subtitle: 'Opportunities to level up',
            items: coaching.whatToImprove,
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            iconColor: 'text-orange-600',
            icon: '↑'
        },
        {
            title: '⚠️ Mindset & Safety',
            subtitle: 'Keep this in mind',
            items: coaching.safetyMindset,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            icon: '⚠️'
        },
        {
            title: '🎯 Action Plan',
            subtitle: 'Focus for your next flight',
            items: coaching.nextFlightPlan,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-600',
            icon: '🎯'
        }
    ];

    let html = '<div class="coaching-walkthrough">';

    html += `
        <div class="coaching-header">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-base font-bold text-slate-900 mb-1">Flight Debrief</h3>
                    <p class="text-xs text-slate-600">Review your performance and plan improvements</p>
                </div>
                <button id="startWalkthroughBtn" class="walkthrough-start-btn">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    Start Walkthrough
                </button>
            </div>
        </div>
    `;

    sections.forEach((section) => {
        if (section.items.length > 0) {
            html += `
                <div class="coaching-section ${section.bgColor} ${section.borderColor}">
                    <div class="coaching-section-header">
                        <div class="coaching-section-icon ${section.iconColor}">${section.icon}</div>
                        <div>
                            <div class="coaching-section-title">${section.title}</div>
                            <div class="coaching-section-subtitle">${section.subtitle}</div>
                        </div>
                    </div>
                    <div class="coaching-items">
                        ${section.items.map((item) => `
                            <div class="coaching-item">
                                <div class="coaching-item-bullet ${section.iconColor}">•</div>
                                <div class="coaching-item-text">${item}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });

    html += '</div>';

    if (getCoachingItemCount(coaching) === 0) {
        html = '<div class="text-sm text-slate-500 p-4">No coaching feedback available</div>';
    }

    return html;
}

export {
    renderCoachingPanel,
    generateCoachingHTML,
    getCoachingItemCount
};
