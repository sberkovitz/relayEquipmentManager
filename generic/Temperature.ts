import { logger } from "../logger/Logger";
import { GenericDeviceBase } from "./genericDevices";
import { AnalogDevices } from "../devices/AnalogDevices";
import { utils } from "../boards/Constants";

import { webApp } from "../web/Server";

export class Thermistor10k extends GenericDeviceBase {
    // Fix 1: extract a clean number from scalar, {adcValue}, or {value}; null for anything else.
    // Prefers .adcValue over .value so a full channel object (whose .value is °C) does not
    // silently become the wrong unit on a semantic slot.
    private normalizeNumber(value: any): number | null {
        if (typeof value === 'number') return value;
        if (value !== null && typeof value === 'object') {
            if (typeof value.adcValue === 'number') return value.adcValue;
            if (typeof value.value === 'number') return value.value;
        }
        return null;
    }

    // Fix 6: shared helper — derive all three temperature scales + display temperature from one value+unit pair.
    private applyTemperature(val: number, inUnit: string): void {
        const device = this.device;
        device.values.tempC = utils.convert.temperature.convertUnits(val, inUnit, 'c');
        device.values.tempF = utils.convert.temperature.convertUnits(val, inUnit, 'f');
        device.values.tempK = utils.convert.temperature.convertUnits(val, inUnit, 'k');
        device.values.temperature = utils.convert.temperature.convertUnits(val, inUnit, (device.values.units || 'F').toLowerCase()) + (device.options.calibration || 0);
    }

    public setValue(prop, value) {
        let replaceSymbols = /(?:\]\.|\[|\.)/g
        let _prop = prop.indexOf(',') > -1 ? prop.replace(replaceSymbols, ',').split(',') : prop;
        let dt = this.device.getDeviceType();

        // Fix 1: normalise incoming value before any path uses it.
        const normalized = this.normalizeNumber(value);
        if (normalized === null) {
            logger.error(`Thermistor10k: non-numeric value on ${prop}: ${JSON.stringify(value)}`);
            return;
        }
        let val = normalized;

        if (typeof dt.inputs !== 'undefined') {
            let inp = dt.inputs.find(x => x.name === prop);
            if (typeof inp !== 'undefined') {
                switch (inp.dataType) {
                    case 'number':
                        // normalizeNumber already handled extraction
                        break;
                }
            }
        }
        this.device.values[_prop] = val;

        // Semantic temperature slot — prop name carries the unit; inputType is irrelevant.
        const lp = (typeof prop === 'string') ? prop.toLowerCase() : '';
        if (lp === 'tempc' || lp === 'tempf' || lp === 'tempk') {
            const device = this.device;
            const inUnit = lp.slice(4); // 'c', 'f', or 'k'
            device.values.units = device.options.units;
            device.values.inputValue = val;
            device.values.inputUnits = inUnit === 'c' ? '\u00B0C' : inUnit === 'f' ? '\u00B0F' : '\u00B0K';
            device.values.resistance = null;   // Fix 2: clear stale resistance from prior resistance-mode reading
            device.values.inputMode = prop;    // Fix 3: e.g. "tempF", "tempC", "tempK"
            this.applyTemperature(val, inUnit); // Fix 6
            webApp.emitToClients('genericDataValues', { id: device.id, typeId: device.typeId, values: this.values });
            this.emitFeeds();
            return;
        }

        this.convertValue(val);
        webApp.emitToClients('genericDataValues', { id: this.device.id, typeId: this.device.typeId, values: this.values });
        this.emitFeeds();
    }
    public convertValue(value: number) {
        let device = this.device;
        let maps = AnalogDevices.maps;
        device.values.units = device.options.units;
        // inputValue always reflects the raw received value for display in the Readings panel.
        device.values.inputValue = device.values.adcValue;
        // Fix 3: record active path so "Received As" UI field can show what happened.
        // For ohms mode, reflect the actual sub-unit (kohms vs ohms) not just the mode key.
        const modeLabel = device.options.inputType === 'ohms'
            ? (device.options.inputResistanceUnits === 1000 ? 'kohms' : 'ohms')
            : device.options.inputType;
        device.values.inputMode = `adcValue:${modeLabel}`;

        // Pre-calculated temperature: adcValue is already in the named unit.
        switch (device.options.inputType) {
            case 'tempC':
                device.values.inputUnits = '\u00B0C';
                device.values.resistance = null;  // Fix 2: no stale resistance for temp path
                this.applyTemperature(device.values.adcValue, 'c'); // Fix 6
                return value;
            case 'tempF':
                device.values.inputUnits = '\u00B0F';
                device.values.resistance = null;  // Fix 2
                this.applyTemperature(device.values.adcValue, 'f'); // Fix 6
                return value;
            case 'tempK':
                device.values.inputUnits = '\u00B0K';
                device.values.resistance = null;  // Fix 2
                this.applyTemperature(device.values.adcValue, 'k'); // Fix 6
                return value;
        }

        // Resistance-based path: convert ADC value → resistance → temperature.
        device.values.inputUnits = device.options.inputType === 'raw' ? '' : device.options.inputType === 'volt' ? 'volts' : device.options.inputResistanceUnits === 1000 ? 'kOhms' : 'ohms';
        device.values.maxVal = (device.options.inputType === 'raw') ? (1 << device.options.inputBitness) : device.options.inputType === 'volt' ? device.options.vccRef : 10000;
        switch (device.options.inputType) {
            case 'ohms':
                device.values.resistance = device.values.adcValue * device.options.inputResistanceUnits;
                break;
            case 'kohms':
                device.values.resistance = (10000 * device.values.adcValue) / (device.values.maxVal - device.values.adcValue);
                break;
            case 'raw':
            case 'volt':
                device.values.resistance = 10000 * (device.values.adcValue / (device.values.maxVal - device.values.adcValue));
                break;
        }
        switch (device.options.calcType) {
            case 'shart':
                device.values.tempK = utils.convert.temperature.shart3(device.values.resistance, 0.001125308852122, 0.000234711863267, 0.000000085663516, 'K');
                break;
            default:
                device.values.tempK = (Math.round(maps['thermistor10k'].interpolate(device.values.resistance, 'K') * 100) / 100);
                break;
        }
        this.applyTemperature(device.values.tempK, 'k'); // Fix 6: derive C/F/display from resistance-derived K
        return value;
    }
}
