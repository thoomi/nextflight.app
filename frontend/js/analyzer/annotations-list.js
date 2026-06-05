function renderAnnotationsList({
    annotations,
    selectedAnnotationId,
    container,
    ids,
    cssClasses,
    svgPaths,
    buttonText,
    formatters,
    onAdd,
    onDelete,
    onSelect
}) {
    container.innerHTML = '';
    container.appendChild(createAddAnnotationCard({
        ids,
        cssClasses,
        svgPaths,
        buttonText,
        onAdd
    }));

    annotations.forEach((annotation, index) => {
        container.appendChild(createAnnotationCard({
            annotation,
            index,
            selected: selectedAnnotationId === annotation.id,
            cssClasses,
            svgPaths,
            formatters,
            onDelete,
            onSelect
        }));
    });
}

function createAddAnnotationCard({ ids, cssClasses, svgPaths, buttonText, onAdd }) {
    const card = document.createElement('div');
    card.id = ids.addAnnotationCard;
    card.className = `${cssClasses.annotationCard} ${cssClasses.addCard}`;
    card.innerHTML = `
        <button id="${ids.addAnnotationBtn}" class="add-annotation-btn">
            <svg class="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${svgPaths.plus}"/>
            </svg>
            <span class="text-xs font-medium text-slate-600 mt-1">${buttonText.annotationMode.inactive}</span>
        </button>
    `;

    card.querySelector(`#${ids.addAnnotationBtn}`).addEventListener('click', onAdd);
    return card;
}

function createAnnotationCard({
    annotation,
    index,
    selected,
    cssClasses,
    svgPaths,
    formatters,
    onDelete,
    onSelect
}) {
    const card = document.createElement('div');
    card.className = `${cssClasses.annotationCard} ${selected ? cssClasses.selected : ''}`;
    card.dataset.annotationId = annotation.id;
    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="text-xs font-medium text-slate-900">${annotation.text}</div>
                <div class="text-xs text-slate-500 mt-1">
                    ${formatters.formatTime(annotation.point.timeS)} | ${formatters.formatAltitude(annotation.point.altM)}
                </div>
            </div>
            <button class="text-slate-400 hover:text-red-500" type="button" data-delete-annotation>
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${svgPaths.close}" />
                </svg>
            </button>
        </div>
    `;

    card.addEventListener('click', () => onSelect(annotation, index));
    card.querySelector('[data-delete-annotation]').addEventListener('click', (event) => {
        event.stopPropagation();
        onDelete(annotation, index);
    });

    return card;
}

if (typeof window !== 'undefined') {
    window.renderAnnotationsList = renderAnnotationsList;
}

export {
    renderAnnotationsList
};
