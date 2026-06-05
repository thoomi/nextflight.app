import {
    analyze,
    generateCoaching,
    CONFIG
} from './core/flight-analyzer.js';

if (typeof window !== 'undefined') {
    window.analyze = analyze;
    window.generateCoaching = generateCoaching;
    window.FLIGHT_ANALYZER_CONFIG = CONFIG;
}

export {
    analyze,
    generateCoaching,
    CONFIG
};
