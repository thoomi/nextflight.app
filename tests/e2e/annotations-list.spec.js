import { expect, test } from '@playwright/test';

test('annotations list module renders cards and wires callbacks', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const { renderAnnotationsList } = await import('/js/analyzer/annotations-list.js');

    const container = document.createElement('div');
    const events = [];
    renderAnnotationsList({
      annotations: [
        {
          id: 42,
          text: 'Rough climb',
          point: { altM: 1234, timeS: 90 },
        },
      ],
      selectedAnnotationId: 42,
      container,
      ids: {
        addAnnotationBtn: 'addAnnotationBtn',
        addAnnotationCard: 'addAnnotationCard',
      },
      cssClasses: {
        addCard: 'add-card',
        annotationCard: 'annotation-card',
        selected: 'selected',
      },
      svgPaths: {
        close: 'M6 18L18 6M6 6l12 12',
        plus: 'M12 4v16m8-8H4',
      },
      buttonText: {
        annotationMode: { inactive: 'Add note' },
      },
      formatters: {
        formatAltitude: (value) => `${value} m`,
        formatTime: (value) => `${value}s`,
      },
      onAdd: () => events.push('add'),
      onDelete: (annotation, index) => events.push(`delete-${annotation.id}-${index}`),
      onSelect: (annotation, index) => events.push(`select-${annotation.id}-${index}`),
    });

    container.querySelector('#addAnnotationBtn').click();
    container.querySelector('[data-annotation-id="42"]').click();
    container.querySelector('[data-delete-annotation]').click();

    return {
      events,
      html: container.innerHTML,
      selected: container.querySelector('[data-annotation-id="42"]').classList.contains('selected'),
      text: container.textContent,
    };
  });

  expect(result.events).toEqual(['add', 'select-42-0', 'delete-42-0']);
  expect(result.html).not.toContain('onclick=');
  expect(result.selected).toBe(true);
  expect(result.text).toContain('Rough climb');
  expect(result.text).toContain('90s | 1234 m');
});
