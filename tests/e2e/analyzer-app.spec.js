import { expect, test } from '@playwright/test';

const cesiumStub = `
window.Cesium = {
  Ion: { defaultAccessToken: '' },
  createWorldTerrainAsync: async () => ({}),
  IonImageryProvider: {
    fromAssetId: async () => ({})
  },
  Viewer: class {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.resolutionScale = 1;
      this.imageryLayers = { addImageryProvider() {} };
      this.entities = {
        values: [],
        add(entity = {}) {
          this.values.push(entity);
          return entity;
        },
        remove(entity) {
          this.values = this.values.filter((candidate) => candidate !== entity);
        }
      };
      this.scene = {
        canvas: document.createElement('canvas'),
        globe: {},
        primitives: { add(entity) { return entity; }, remove() {} },
        preRender: { addEventListener() {} },
        postRender: { addEventListener() {} },
        requestRender() {},
        pick() { return null; },
        pickPosition() { return null; },
        screenSpaceCameraController: {}
      };
      this.camera = {
        heading: 0,
        pitch: 0,
        position: {},
        transform: {},
        changed: { addEventListener() {} },
        setView() {},
        getPickRay() { return null; },
        pickEllipsoid() { return null; },
        lookAtTransform() {}
      };
    }
  },
  ScreenSpaceEventHandler: class {
    setInputAction() {}
    destroy() {}
  },
  ScreenSpaceEventType: { LEFT_CLICK: 'LEFT_CLICK' },
  CameraEventType: {
    WHEEL: 'WHEEL',
    PINCH: 'PINCH',
    LEFT_DRAG: 'LEFT_DRAG',
    RIGHT_DRAG: 'RIGHT_DRAG'
  },
  KeyboardEventModifier: { SHIFT: 'SHIFT', CTRL: 'CTRL' },
  Cartesian3: {
    fromDegrees: (lon, lat, alt) => ({ lon, lat, alt }),
    distance: () => 1000
  },
  Math: {
    toRadians: (deg) => deg * globalThis.Math.PI / 180
  },
  Matrix4: {
    equals: () => true
  },
  Transforms: {
    eastNorthUpToFixedFrame: (center) => ({ center })
  },
  Color: {
    fromCssColorString: (color) => ({ color, withAlpha(alpha) { return { color, alpha }; } }),
    GRAY: { withAlpha: (alpha) => ({ color: 'gray', alpha }) }
  },
  Material: {
    fromType: (type, options) => ({ type, options })
  },
  PolylineCollection: class {
    constructor() {
      this.items = [];
    }
    add(item) {
      this.items.push(item);
      return item;
    }
  },
  JulianDate: {
    now: () => ({})
  }
};
`;

test('analyzer app page starts with module bootstrap', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('dialog', (dialog) => dialog.dismiss());

  await page.route('https://cesium.com/downloads/cesiumjs/releases/1.123/Build/Cesium/Cesium.js', (route) => (
    route.fulfill({ contentType: 'application/javascript', body: cesiumStub })
  ));
  await page.route('https://cdn.tailwindcss.com/', (route) => (
    route.fulfill({ contentType: 'application/javascript', body: '' })
  ));

  const initialized = page.waitForEvent('console', {
    predicate: (message) => message.text() === 'Application initialized successfully',
  });

  await page.goto('/app.html');
  await initialized;

  await expect(page.locator('#dropZone')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
