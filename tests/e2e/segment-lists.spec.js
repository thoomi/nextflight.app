import { expect, test } from '@playwright/test';

test('segment list module renders thermals and glides with callbacks', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const {
      getGlideTypeMeta,
      renderGlidesList,
      renderThermalsList,
    } = await import('/js/analyzer/segment-lists.js');

    const thermalContainer = document.createElement('div');
    const glideContainer = document.createElement('div');
    const events = [];
    const cssClasses = {
      climbPositive: 'climb-positive',
      thermalItem: 'thermal-item',
    };

    renderThermalsList({
      thermals: [
        { maxClimb: 2.1, avgClimb: 1.0, circles: 3.2, earlyExit: true },
      ],
      container: thermalContainer,
      cssClasses,
      formatters: {
        formatVario: (value) => `${value.toFixed(1)} m/s`,
      },
      onClearSelection: () => events.push('thermal-clear'),
      onMouseEnter: (index) => events.push(`thermal-enter-${index}`),
      onMouseLeave: () => events.push('thermal-leave'),
      onSelect: (_thermal, index) => events.push(`thermal-select-${index}`),
    });

    thermalContainer.querySelector('[data-thermal-index="0"]').dispatchEvent(new Event('mouseenter'));
    thermalContainer.querySelector('[data-thermal-index="0"]').dispatchEvent(new Event('mouseleave'));
    thermalContainer.querySelector('[data-thermal-index="0"]').click();
    thermalContainer.querySelector('#clearThermalSelection').click();

    renderGlidesList({
      glides: [
        {
          avgVario: -1.3,
          direction: 'NE',
          durationS: 90,
          glideRatio: 5.5,
          glideType: 'straight',
          speedbarOpportunity: true,
          speedbarReasons: ['headwind'],
          speedbarWorthwhile: true,
          straightDistance: 2400,
        },
      ],
      container: glideContainer,
      cssClasses,
      formatters: {
        formatTime: (value) => `${value}s`,
        formatVario: (value) => `${value.toFixed(1)} m/s`,
      },
      onClearSelection: () => events.push('glide-clear'),
      onMouseEnter: (index) => events.push(`glide-enter-${index}`),
      onMouseLeave: () => events.push('glide-leave'),
      onSelect: (_glide, index) => events.push(`glide-select-${index}`),
    });

    glideContainer.querySelector('[data-glide-index="0"]').dispatchEvent(new Event('mouseenter'));
    glideContainer.querySelector('[data-glide-index="0"]').dispatchEvent(new Event('mouseleave'));
    glideContainer.querySelector('[data-glide-index="0"]').click();
    glideContainer.querySelector('#clearGlideSelection').click();

    return {
      events,
      glideMeta: getGlideTypeMeta({ glideType: 'searching' }).typeLabel,
      glideText: glideContainer.textContent,
      thermalText: thermalContainer.textContent,
    };
  });

  expect(result.thermalText).toContain('Thermal 1');
  expect(result.thermalText).toContain('Early Exit');
  expect(result.glideText).toContain('Glide 1');
  expect(result.glideText).toContain('Speedbar');
  expect(result.glideText).toContain('headwind');
  expect(result.glideMeta).toBe('Searching');
  expect(result.events).toEqual([
    'thermal-enter-0',
    'thermal-leave',
    'thermal-select-0',
    'thermal-clear',
    'glide-enter-0',
    'glide-leave',
    'glide-select-0',
    'glide-clear',
  ]);
});
