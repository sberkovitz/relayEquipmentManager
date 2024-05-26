﻿//SMART FAN
import * as fs from 'fs';
import { logger } from "../logger/Logger";
import { vMaps, valueMap, utils } from "../boards/Constants";
import { setTimeout, clearTimeout } from "timers";
import * as extend from "extend";
import { Buffer } from "buffer";
import { i2cDeviceBase } from "./I2cBus";
import { webApp } from "../web/Server";
import { I2cDevice, DeviceBinding, cont, GpioPin } from "../boards/Controller";
import { Gpio } from 'onoff';
const gp = require('onoff').Gpio;

export class SequentSmartFanV6 extends i2cDeviceBase {
    protected regs = {
        I2C_MEM_FAN_POWER: 0,
              
        I2C_MEM_TIME_TO_STOP_SET: 5, //2bytes
        I2C_MEM_TIME_TO_STOP_REM: 7,

        hwVersion: 100,
        hwVersion_minor: 101,
      

        SLAVE_BUFF_SIZE: 108
    };
    protected powerPin: Gpio;
    protected cliVer:number = 1;
    protected _timerRead: NodeJS.Timeout;
    protected _infoRead: NodeJS.Timeout;
    protected _suspendPolling: number = 0;
    protected _pollInformationInterval = 3000;
    protected logError(err, msg?: string) { logger.error(`${this.device.name} ${typeof msg !== 'undefined' ? msg + ' ' : ''}${typeof err !== 'undefined' ? err.message : ''}`); }
    protected get version(): number { return typeof this.device !== 'undefined' && this.options !== 'undefined' && typeof this.device.info !== 'undefined' ? parseFloat(this.device.info.firmware) : 0 }
    protected processing = 0;
    protected get fanCurve(): { curve: string, linear: { start: number, end: number, min: number }, exp: { start: number, min: number, ramp: string }, log: { start: number, min: number, ramp: string } } {
        if (typeof this.options.fanCurve === 'undefined') {
            this.options.fanCurve = { curve: this.cliVer < 4 ? 'custom' : 'linear' };
        }
        if (typeof this.options.fanCurve.linear === 'undefined') this.options.fanCurve.linear = {
            start: Math.round(utils.convert.temperature.convertUnits(30, 'C', this.options.units)),
            end: Math.round(utils.convert.temperature.convertUnits(70, 'C', this.options.units)),
            min: 0
        };
        if (typeof this.options.fanCurve.exp === 'undefined') this.options.fanCurve.exp = {
            start: utils.convert.temperature.convertUnits(30, 'C', this.options.units),
            min: 0,
            ramp: 'slow'
        };
        if (typeof this.options.fanCurve.log === 'undefined') this.options.fanCurve.log = {
            start: utils.convert.temperature.convertUnits(30, 'C', this.options.units),
            min: 0,
            ramp: 'slow'
        };
        return this.options.fanCurve;
    }
    protected changeUnits(from: string, to: string) {
        //if (from === to) return;
        //console.log(`Changing units from ${from} to ${to}`);
        let fc = this.fanCurve;
        let ct = utils.convert.temperature.convertUnits;
        //console.log(fc);
        this.options.fanCurve.linear.start = utils.convert.temperature.convertUnits(fc.linear.start, from, to);
        this.options.fanCurve.linear.end = utils.convert.temperature.convertUnits(fc.linear.end, from, to);
        this.options.fanCurve.exp.start = utils.convert.temperature.convertUnits(fc.exp.start, from, to);
        this.options.fanCurve.log.start = utils.convert.temperature.convertUnits(fc.log.start, from, to);
        //console.log(fc);        
        this.values.cpuTemp = ct(this.values.cpuTemp, from, to);           
        this.options.units = this.values.units = to;     
        webApp.emitToClients('i2cDataValues', { bus: this.i2c.busNumber, address: this.device.address, values: this.values });
    }
    public evalFanPower: Function;
    public async initAsync(deviceType): Promise<boolean> {
        try {
            if (deviceType.id === 1003) this.cliVer = 6;
            if (typeof this.options.fanCurve === 'undefined' || typeof this.options.fanCurve === 'string') {
                this.options.fanCurve = undefined;
                let fc = this.fanCurve;
                logger.info(`Setting ${this.device.name} inital curves ${fc.curve}`);
            }
            
            this.stopPolling();
            if (typeof this.options.readInterval === 'undefined') this.options.readInterval = 3000;
            this.options.readInterval = Math.max(500, this.options.readInterval);
            if (typeof this.device.options.name !== 'string' || this.device.options.name.length === 0) this.device.name = this.device.options.name = deviceType.name;
            else this.device.name = this.device.options.name;        
            if (typeof this.device.options.units === 'undefined') {
                this.device.options.units = this.device.values.units = 'C';
            }
            if (typeof this.options.fanPowerFn !== 'undefined' && this.options.fanPowerFn.length > 0)
                this.evalFanPower = new Function('options', 'values', 'info', this.options.fanPowerFn);
            if (this.device.isActive) {
                await this.getHwFwVer();         
                this.powerPin = new gp(524, 'out');      
                // this.powerPin = await cont.gpio.setPinAsync(1, 32,
                //     {
                //         isActive: true,
                //         name: `${this.device.name} Power`, direction: 'output',
                //         isInverted: false, initialState: 'off', debounceTimeout: 0
                //     }
                // );                            
                this.powerPin.writeSync(1);
                await this.getFanPower();                           
                await this.getStatus();
            }
        }
        catch (err) { this.logError(err); return Promise.resolve(false); }
        finally {
            // setTimeout(() => { this.pollDeviceInformation(); }, 2000);
            setTimeout(() => { this.pollReadings(); }, 5000);
        }
    }
    public async setOptions(opts): Promise<any> {
        try {
            this.suspendPolling = true;
            if (typeof opts.name !== 'undefined' && this.device.name !== opts.name) this.options.name = this.device.name = opts.name;            
            if (typeof opts.readInterval !== 'undefined') this.options.readInterval = opts.readInterval;            
            if (typeof opts.fanCurve !== 'undefined') {
                let fc = this.fanCurve;
                if (typeof opts.fanCurve.curve !== 'undefined') fc.curve = opts.fanCurve.curve;
                if (typeof opts.fanCurve.linear !== 'undefined') {
                    let curve = opts.fanCurve.linear;
                    if (typeof curve.start !== 'undefined') fc.linear.start = curve.start;
                    if (typeof curve.end !== 'undefined') fc.linear.end = curve.end;
                    if (typeof curve.min !== 'undefined') fc.linear.min = curve.min;
                }
                if (typeof opts.fanCurve.exp !== 'undefined') {
                    let curve = opts.fanCurve.exp;
                    if (typeof curve.start !== 'undefined') fc.exp.start = curve.start;
                    if (typeof curve.ramp !== 'undefined') fc.exp.ramp = curve.ramp;
                    if (typeof curve.min !== 'undefined') fc.exp.min = curve.min;
                }
                if (typeof opts.fanCurve.log !== 'undefined') {
                    let curve = opts.fanCurve.log;
                    if (typeof curve.start !== 'undefined') fc.log.start = curve.start;
                    if (typeof curve.ramp !== 'undefined') fc.log.ramp = curve.ramp;
                    if (typeof curve.min !== 'undefined') fc.log.min = curve.min;
                }
            }            
            if (typeof opts.units !== 'undefined' && this.options.units !== opts.units) this.setUnits(opts.units);

            if (typeof opts.fanPowerFn !== 'undefined' && opts.fanPowerFn !== this.options.fanPowerFn) {
                this.evalFanPower = new Function('options', 'values', 'info', opts.fanPowerFn);
                this.options.fanPowerFn = opts.fanPowerFn;
            }
            return this.options;
        }
        catch (err) { this.logError(err); Promise.reject(err); }
        finally { this.suspendPolling = false; }
    }
    public setUnits(value: string): Promise<boolean> {
        try {
            if (!['C', 'F', 'K'].includes(value.toUpperCase())) return Promise.reject(new Error(`Cannot set units to ${value}`));
            let prevUnits = this.values.units || 'C';
            this.changeUnits(prevUnits, value);
        }
        catch (err) { this.logError(err); }
    }
    protected async getHwFwVer() {
        try {
            if (this.i2c.isMock) {
                this.info.fwVersion = this.cliVer >= 4 ? `1.0 Mock` : '1.0 Mock';
                this.info.hwVersion = this.cliVer >= 4 ? `4.0 Mock` : '0.1 Mock';
            } else {             
                // Sequent did it again.  The completely revised the smart fan so it does not return this information on later versions.
                this.info.hwVersion = `6.0`;                    
                this.cliVer = 6;
            }
        } catch (err) { logger.error(`${this.device.name} error getting firmware version: ${err.message}`); }
    }
    protected async getFanPower() {
        try {
            if (this.i2c.isMock) Math.round(Math.random() * 100); // Don't get the fan power from the register in this case
        
            let fanPower = 0;                    
            let readValue = await this.i2c.readByte(this.device.address, this.regs.I2C_MEM_FAN_POWER);
            readValue = 255 - readValue;
            fanPower = Math.round(readValue / 2.55);        

            this.values.fanPower = fanPower;
    
        } catch (err) { logger.error(`${this.device.name} error getting fan power: ${err.message}`); }
    }
    protected calcFanPower(): number {
        let val: number = 0, _val: number = 0;
        if (this.fanCurve.curve === 'custom') {
            val = _val = typeof this.evalFanPower === 'function' ? Math.round(this.evalFanPower(this.options, this.values, this.info)) : 0;
            if (isNaN(val)) {
                logger.error(`Sequent Smart Fan: Result of expression is isNaN.  Function evaluated is ${this.evalFanPower.toString()}`);
                val = 0;
            }
        }
        else if (this.fanCurve.curve === 'linear') {
            let curve = this.fanCurve.linear;
            let slope = (curve.end - curve.start) * .01;
            _val = (slope * (this.values.cpuTemp - curve.start)) + (curve.min || 0);
            _val = Math.max(Math.min(_val, 100), 0);
            val = Math.max(_val, curve.min);
        }
        else if (this.fanCurve.curve === 'log') {
            let curve = this.fanCurve.log;
            let b = 1.06;
            let temp = utils.convert.temperature.convertUnits(this.values.cpuTemp, this.values.units, 'C');
            let start = utils.convert.temperature.convertUnits(curve.start, this.values.units, 'C');

            switch (curve.ramp) {
                case 'slow':
                    b = 1.08;
                case 'medium':
                    b = 1.06;
                case 'fast':
                    b = 1.04;
            }
            _val = Math.log(Math.max(.001, temp - start)) / Math.log(b);
            //_val = (Math.log(Math.max(.001, this.values.cpuTemp - curve.start)) * (1 / Math.log(b)));
            _val = Math.max(Math.min(_val, 100), 0);
            val = Math.max(_val, curve.min);
        }
        else if (this.fanCurve.curve === 'exp') {
            let curve = this.fanCurve.exp;
            let temp = utils.convert.temperature.convertUnits(this.values.cpuTemp, this.values.units, 'C');
            let start = utils.convert.temperature.convertUnits(curve.start, this.values.units, 'C');
            if (temp > start) {
                let b = 1.07;
                switch (curve.ramp) {
                    case 'slow':
                        b = 1.07;
                        break;
                    case 'medium':
                        b = 1.1;
                        break;
                    case 'fast':
                        b = 1.15;
                        break;
                }
                _val = Math.pow(b, (this.values.cpuTemp - curve.start)) + curve.min - 1;
            }
            else
                _val = 0;
            _val = Math.max(Math.min(_val, 100), 0);
            val = Math.max(_val, curve.min)
        }
        this.values.fanPowerFnVal = _val;
        return Math.round(Math.max(Math.min(val, 100), 0));
    }
    protected async setFanPower() {
        try {
            let val = this.calcFanPower();
            if (val !== this.values.fanPower) {             
                // Sequent occupies a gpio pin to turn on and off the fan.
                let pwr = Math.round(255 - Math.min(val * 2.55, 255));
                if (typeof this.powerPin !== 'undefined')  this.powerPin.writeSync((val > 0 ? 1 : 0));
                let buffer = Buffer.from([pwr]);
                logger.verbose(`${this.device.name} setFanPower = ${pwr} val = ${val}`);
                if (!this.i2c.isMock)
                    await this.i2c.writeI2cBlock(this.device.address, this.regs.I2C_MEM_FAN_POWER, 1, buffer);
                else {
                    this.values.fanPower = val;
                }        
            }
        }
        catch (err) { logger.error(`${this.device.name} error setting fan power: ${err.message}`); }
    }
   
    protected getCpuTemp(): number {
        try {                        
            if (this.i2c.isMock) {
                return utils.convert.temperature.convertUnits(72 + (Math.round((5 * Math.random()) * 100) / 100), 'f', this.values.units);
            }
            if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
                let buffer = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp');
                let cpuTemp: number;
                cpuTemp = utils.convert.temperature.convertUnits(parseInt(buffer.toString().trim(), 10) / 1000, 'C', this.values.units);
                this.values.cpuTemp = cpuTemp;
                return cpuTemp;
            }
        } catch (err) { logger.error(`${this.device.name} error getting cpu temp: ${err.message}`); }
    }  
  
    protected pollDeviceInformation() {
        try {
            if (this._infoRead) clearTimeout(this._infoRead);
            this._infoRead = null;
            if (!this.suspendPolling && this.device.isActive) {
                this.getDeviceInformation();
            }
        }
        catch (err) { this.logError(err, 'Error Polling Device Information'); }
        finally { this._infoRead = setTimeout(() => { this.pollDeviceInformation(); }, this._pollInformationInterval); }
    }
    protected async takeReadings(): Promise<boolean> {
        try {
            let _values = JSON.parse(JSON.stringify(this.values));            
            await this.setFanPower(); //not a reading; but set the value and then make sure it is set properly.
            await this.getCpuTemp();
            await this.getFanPower();
            if (this.values.fanPower !== _values.fanPower || this.values.fanPowerFnVal !== _values.fanPowerFnVal) {
                webApp.emitToClients('i2cDataValues', { bus: this.i2c.busNumber, address: this.device.address, values: this.values });
            }
            this.emitFeeds();
            return true;
        }
        catch (err) { this.logError(err, 'Error taking device readings'); }
    }
    protected pollReadings() {
        try {
            if (this._timerRead) clearTimeout(this._timerRead);
            this._timerRead == null;
            if (!this.suspendPolling && this.device.isActive) {
                (async () => {
                    await this.takeReadings()
                        .catch(err => { logger.error(err); });
                })();


            }
        }
        catch (err) { this.logError(err, 'Error Polling Device Values'); }
        finally { this._timerRead = setTimeout(() => { this.pollReadings(); }, this.options.readInterval) }
    }
    public get suspendPolling(): boolean { if (this._suspendPolling > 0) logger.warn(`${this.device.name} Suspend Polling ${this._suspendPolling}`); return this._suspendPolling > 0; }
    public set suspendPolling(val: boolean) {
        this._suspendPolling = Math.max(0, this._suspendPolling + (val ? 1 : -1));
    }
    public stopPolling() {
        this.suspendPolling = true;
        if (this._timerRead) clearTimeout(this._timerRead);
        if (this._infoRead) clearTimeout(this._infoRead);
        this._timerRead = this._infoRead = null;
        this._suspendPolling = 0;
    }
    public async getStatus(): Promise<boolean> {
        try {
            this.suspendPolling = true;
            return true;
        }
        catch (err) { logger.error(`Error getting info ${typeof err !== 'undefined' ? err.message : ''}`); return Promise.reject(err); }
        finally { this.suspendPolling = false; }
    }
    public async getDeviceInformation(): Promise<boolean> {
        try {
            this.suspendPolling = true;
            await this.getStatus();
            webApp.emitToClients('i2cDeviceInformation', { bus: this.i2c.busNumber, address: this.device.address, info: this.device.info });
        }
        catch (err) { logger.error(`Error retrieving device status: ${typeof err !== 'undefined' ? err.message : ''}`); return Promise.reject(err); }
        finally { this.suspendPolling = false; }
    }
    public async closeAsync(): Promise<void> {
        try {
            await this.stopPolling();
            await super.closeAsync();
            return Promise.resolve();
        }
        catch (err) { return this.logError(err); }
    }
    public getValue(prop: string) {
        let p = prop.toLowerCase();
        switch (p) {
            case 'cputempc':
                return utils.convert.temperature.convertUnits(this.getCpuTemp(), this.values.units, 'C');
            case 'cputempf':
                return utils.convert.temperature.convertUnits(this.getCpuTemp(), this.values.units, 'F');
            case 'cputempk':
                return utils.convert.temperature.convertUnits(this.getCpuTemp(), this.values.units, 'K');        
            case 'fwversion':
                return this.info.fwVersion;
            default:
                return this.values[prop];
        }
    }
    public calcMedian(prop: string, values: any[]) {
        let p = prop.toLowerCase();
        switch (p) {
            case 'cputempc':
            case 'cputempf':
            case 'cputempk':        
            case 'inputvoltage':
            case 'pivoltage':
                return super.calcMedian(prop, values);
            case 'fwversion':
                return this.info.fwVersion;
            default:
                // Determine whether this is an object.
                if (p.startsWith('in') || p.startsWith('out')) {
                    if (values.length > 0 && typeof values[0] === 'object') {
                        let io = this.getValue(prop);
                        if (typeof io !== 'undefined') {
                            let vals = [];
                            for (let i = 0; i < values.length; i++) vals.push(values[i].value);
                            return extend(true, {}, io, { value: super.calcMedian(prop, vals) })
                        }
                    }
                    else return super.calcMedian(prop, values);
                }
                else logger.error(`${this.device.name} error calculating median value for ${prop}.`);
        }
    }
    public setValue(prop: string, value) {
        let p = prop.toLowerCase();
        if (prop.includes('temp')) {

            if (prop.slice(-1) === this.options.units) { this.info.cpuTemp = value; }
            else {
                this.info.cpuTemp = utils.convert.temperature.convertUnits(value, prop.slice(-1), this.options.units);
            }
            webApp.emitToClients('i2cDeviceInformation', { bus: this.i2c.busNumber, address: this.device.address, info: this.device.info });
        }

        // switch (p) {
        //     default:

        //         break;
        // }
    }
    public async getDeviceState(binding: string | DeviceBinding): Promise<any> {
        try {
            let bind = (typeof binding === 'string') ? new DeviceBinding(binding) : binding;
            // We need to know what value we are referring to.
            if (typeof bind.params[0] === 'string') return this.getValue(bind.params[0]);
            return this.values;
        } catch (err) { return Promise.reject(err); }
    }
    public async setValues(vals): Promise<any> {
        try {
            this.suspendPolling = true;
            return Promise.resolve(this.values);
        }
        catch (err) { this.logError(err); Promise.reject(err); }
        finally { this.suspendPolling = false; }
    }
    // public getDeviceDescriptions(dev) {

    // }
}
