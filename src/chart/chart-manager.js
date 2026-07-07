/* ═══════════════════════════════════════════════════════════
   SpotLab — Chart Manager
   TradingView Lightweight Charts initialization & real-time updates
   ═══════════════════════════════════════════════════════════ */

import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { fetchKlines } from '../api/binance-rest.js';
import { binanceWS } from '../api/binance-ws.js';

class ChartManager {
  constructor() {
    this._chart = null;
    this._candleSeries = null;
    this._volumeSeries = null;
    this._container = null;
    this._currentSymbol = null;
    this._currentInterval = null;
    this._priceLine = null;
    this._markers = [];
    this._resizeObserver = null;

    // SL/TP lines
    this._slLine = null;
    this._tpLine = null;
    this._entryLines = []; // Entry price lines for open positions
  }

  /**
   * Initialize the chart in a container element
   * @param {HTMLElement} container
   */
  init(container) {
    this._container = container;

    this._chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#94a3b8',
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#6366f1',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.07)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.07)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: false },
    });

    // Candlestick series
    this._candleSeries = this._chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Volume series
    this._volumeSeries = this._chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    this._chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Responsive resizing
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this._chart.applyOptions({ width, height });
      }
    });
    this._resizeObserver.observe(container);

    // Listen for real-time kline updates
    binanceWS.on('kline', (data) => this._onKlineUpdate(data));
  }

  /**
   * Load a new symbol/interval
   * @param {string} symbol - e.g. 'BTCUSDT'
   * @param {string} interval - e.g. '1m'
   */
  async loadChart(symbol, interval) {
    this._currentSymbol = symbol;
    this._currentInterval = interval;

    try {
      // Fetch historical data
      const klines = await fetchKlines(symbol, interval, 500);

      // Set candlestick data
      this._candleSeries.setData(klines.map((k) => ({
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      })));

      // Set volume data
      this._volumeSeries.setData(klines.map((k) => ({
        time: k.time,
        value: k.volume,
        color: k.close >= k.open
          ? 'rgba(34, 197, 94, 0.3)'
          : 'rgba(239, 68, 68, 0.3)',
      })));

      // Fit content
      this._chart.timeScale().fitContent();

      // Connect WebSocket for real-time data
      binanceWS.connect(symbol, interval);

    } catch (err) {
      console.error('[Chart] Failed to load:', err);
    }
  }

  /**
   * Handle real-time kline updates from WebSocket
   */
  _onKlineUpdate(data) {
    if (!this._candleSeries) return;

    // Update candlestick
    this._candleSeries.update({
      time: data.time,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
    });

    // Update volume
    this._volumeSeries.update({
      time: data.time,
      value: data.volume,
      color: data.close >= data.open
        ? 'rgba(34, 197, 94, 0.3)'
        : 'rgba(239, 68, 68, 0.3)',
    });
  }

  /**
   * Add/update position entry line on chart
   * @param {string} id - Position ID
   * @param {number} price - Entry price
   * @param {string} side - 'buy' or 'sell'
   */
  addEntryLine(id, price, side) {
    this.removeEntryLine(id);

    const line = this._candleSeries.createPriceLine({
      price: price,
      color: side === 'buy' ? '#6366f1' : '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Entry ${price}`,
    });

    this._entryLines.push({ id, line });
  }

  /**
   * Remove a position entry line
   */
  removeEntryLine(id) {
    const idx = this._entryLines.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this._candleSeries.removePriceLine(this._entryLines[idx].line);
      this._entryLines.splice(idx, 1);
    }
  }

  /**
   * Add/update SL line on chart
   */
  setSLLine(price) {
    this.removeSLLine();
    if (!price) return;

    this._slLine = this._candleSeries.createPriceLine({
      price: price,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'SL',
    });
  }

  /**
   * Remove SL line
   */
  removeSLLine() {
    if (this._slLine) {
      this._candleSeries.removePriceLine(this._slLine);
      this._slLine = null;
    }
  }

  /**
   * Add/update TP line on chart
   */
  setTPLine(price) {
    this.removeTPLine();
    if (!price) return;

    this._tpLine = this._candleSeries.createPriceLine({
      price: price,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'TP',
    });
  }

  /**
   * Remove TP line
   */
  removeTPLine() {
    if (this._tpLine) {
      this._candleSeries.removePriceLine(this._tpLine);
      this._tpLine = null;
    }
  }

  /**
   * Clear all position-related lines
   */
  clearAllLines() {
    this.removeSLLine();
    this.removeTPLine();
    this._entryLines.forEach(({ line }) => {
      this._candleSeries.removePriceLine(line);
    });
    this._entryLines = [];
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._chart) {
      this._chart.remove();
    }
  }
}

export const chartManager = new ChartManager();
