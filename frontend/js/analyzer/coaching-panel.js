import { generateCoaching } from '../core/flight-analyzer.js';

const FEEDBACK_STORAGE_KEY = 'nextflight.coachingFeedback.v1';

function renderCoachingPanel({
    analysis,
    domCache,
    ids,
    cssClasses,
    onStartWalkthrough,
    onEvidenceSelect
}) {
    const coaching = generateCoaching(analysis);
    const coachingHTML = generateCoachingHTML(coaching);
    const container = domCache.get(ids.coachingTabContent);

    container.innerHTML = coachingHTML;
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

        attachEvidenceListeners(container, onEvidenceSelect);
        attachFeedbackListeners(container);
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

function normalizeCoachingItem(item, fallbackId) {
    if (typeof item === 'string') {
        return {
            id: fallbackId,
            text: item,
            plainLanguage: item,
            evidence: []
        };
    }

    return {
        id: item.id || fallbackId,
        text: item.text || '',
        plainLanguage: item.plainLanguage || item.text || '',
        evidence: item.evidence || [],
        priority: item.priority || 'normal'
    };
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatEvidenceTime(seconds) {
    if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
        return '';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
}

function generateCoachingHTML(coaching) {
    const sections = [
        {
            title: 'Strengths',
            subtitle: 'What you did well',
            items: coaching.whatWentWell,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            iconColor: 'text-green-600',
            icon: '+'
        },
        {
            title: 'Growth Areas',
            subtitle: 'Opportunities to level up',
            items: coaching.whatToImprove,
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            iconColor: 'text-orange-600',
            icon: '^'
        },
        {
            title: 'Mindset & Safety',
            subtitle: 'Keep this in mind',
            items: coaching.safetyMindset,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            iconColor: 'text-red-600',
            icon: '!'
        },
        {
            title: 'Action Plan',
            subtitle: 'Focus for your next flight',
            items: coaching.nextFlightPlan,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            iconColor: 'text-blue-600',
            icon: '>'
        }
    ];

    let html = '<div class="coaching-walkthrough">';

    html += `
        <div class="coaching-header">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-base font-bold text-slate-900 mb-1">Flight Debrief</h3>
                    <p class="text-xs text-slate-600">Processed in your browser. Start simple, expand evidence when you want the details.</p>
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

    html += generateQuickDebriefHTML(coaching);
    html += '<details class="coaching-detail-sections"><summary>Detailed coaching notes</summary><div class="coaching-detail-section-list">';

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
                        ${section.items.map((item, index) => {
                            const normalized = normalizeCoachingItem(item, `${section.title}-${index}`);
                            return `
                            <div class="coaching-item">
                                <div class="coaching-item-bullet ${section.iconColor}">•</div>
                                <div class="coaching-item-text">
                                    ${escapeHtml(normalized.text)}
                                    ${generateEvidenceHTML(normalized.evidence)}
                                </div>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });

    html += '</div></details>';
    html += generateFeedbackPromptHTML();
    html += '</div>';

    if (getCoachingItemCount(coaching) === 0) {
        html = '<div class="text-sm text-slate-500 p-4">No coaching feedback available</div>';
    }

    return html;
}

function generateQuickDebriefHTML(coaching) {
    const quick = coaching.quickDebrief || {};
    const cards = [
        {
            title: 'What went well',
            item: quick.whatWentWell || coaching.whatWentWell[0],
            accentClass: 'coaching-quick-card-good'
        },
        {
            title: 'What cost you altitude',
            item: quick.altitudeCost || coaching.whatToImprove[0],
            accentClass: 'coaching-quick-card-cost'
        },
        {
            title: 'Next flight action',
            item: quick.nextAction || coaching.nextFlightPlan[0],
            accentClass: 'coaching-quick-card-action'
        }
    ].filter((card) => card.item);

    if (cards.length === 0) return '';

    return `
        <div class="coaching-quick-debrief" aria-label="Quick debrief">
            ${cards.map((card, index) => {
                const item = normalizeCoachingItem(card.item, `quick-${index}`);
                return `
                    <article class="coaching-quick-card ${card.accentClass}">
                        <div class="coaching-quick-label">${escapeHtml(card.title)}</div>
                        <div class="coaching-quick-text">${escapeHtml(item.plainLanguage || item.text)}</div>
                        ${generateEvidenceHTML(item.evidence)}
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

function generateEvidenceHTML(evidenceList) {
    if (!evidenceList || evidenceList.length === 0) return '';

    return `
        <details class="coaching-evidence">
            <summary>Show evidence</summary>
            <div class="coaching-evidence-list">
                ${evidenceList.map((evidence) => generateEvidenceChipHTML(evidence)).join('')}
            </div>
        </details>
    `;
}

function generateEvidenceChipHTML(evidence) {
    const target = evidence.target || null;
    const timeLabel = formatEvidenceTime(evidence.timeS);
    const label = `${timeLabel ? `${timeLabel} ` : ''}${evidence.label || 'Evidence'}`;
    const detail = evidence.detail ? `<span class="coaching-evidence-detail">${escapeHtml(evidence.detail)}</span>` : '';

    if (!target) {
        return `
            <span class="coaching-evidence-chip">
                <span>${escapeHtml(label)}</span>
                ${detail}
            </span>
        `;
    }

    return `
        <button
            type="button"
            class="coaching-evidence-chip coaching-evidence-button"
            data-evidence-target
            data-target-type="${escapeHtml(target.type)}"
            data-target-id="${escapeHtml(target.id || '')}"
            data-target-index="${target.index ?? ''}"
            data-target-time="${target.timeS ?? ''}"
            data-target-start-idx="${target.startIdx ?? ''}"
            data-target-end-idx="${target.endIdx ?? ''}"
        >
            <span>${escapeHtml(label)}</span>
            ${detail}
        </button>
    `;
}

function generateFeedbackPromptHTML() {
    return `
        <div class="coaching-feedback" data-coaching-feedback>
            <div>
                <div class="coaching-feedback-title">Was this useful?</div>
                <div class="coaching-feedback-subtitle">Stored locally in this browser only.</div>
            </div>
            <div class="coaching-feedback-actions" role="group" aria-label="Debrief usefulness">
                <button type="button" class="coaching-feedback-btn" data-feedback-value="yes">Yes</button>
                <button type="button" class="coaching-feedback-btn" data-feedback-value="no">No</button>
            </div>
            <label class="coaching-feedback-question">
                <span>What question did you still have?</span>
                <textarea data-feedback-question rows="2" placeholder="Optional note"></textarea>
            </label>
            <div class="coaching-feedback-status" data-feedback-status></div>
        </div>
    `;
}

function attachEvidenceListeners(container, onEvidenceSelect) {
    if (!onEvidenceSelect) return;

    container.querySelectorAll('[data-evidence-target]').forEach((button) => {
        button.addEventListener('click', () => {
            onEvidenceSelect({
                type: button.dataset.targetType,
                id: button.dataset.targetId || null,
                index: parseOptionalNumber(button.dataset.targetIndex),
                timeS: parseOptionalNumber(button.dataset.targetTime),
                startIdx: parseOptionalNumber(button.dataset.targetStartIdx),
                endIdx: parseOptionalNumber(button.dataset.targetEndIdx)
            });
        });
    });
}

function attachFeedbackListeners(container) {
    const prompt = container.querySelector('[data-coaching-feedback]');
    if (!prompt || !window.localStorage) return;

    const buttons = prompt.querySelectorAll('[data-feedback-value]');
    const textarea = prompt.querySelector('[data-feedback-question]');
    const status = prompt.querySelector('[data-feedback-status]');
    const state = {
        useful: null,
        question: ''
    };

    function saveFeedback() {
        const existing = JSON.parse(window.localStorage.getItem(FEEDBACK_STORAGE_KEY) || '[]');
        existing.push({
            ...state,
            createdAt: new Date().toISOString()
        });
        window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing.slice(-20)));
        if (status) {
            status.textContent = 'Saved locally';
        }
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            state.useful = button.dataset.feedbackValue;
            buttons.forEach((candidate) => candidate.classList.toggle('selected', candidate === button));
            saveFeedback();
        });
    });

    if (textarea) {
        textarea.addEventListener('change', () => {
            state.question = textarea.value.trim();
            saveFeedback();
        });
    }
}

function parseOptionalNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export {
    renderCoachingPanel,
    generateCoachingHTML,
    getCoachingItemCount
};
