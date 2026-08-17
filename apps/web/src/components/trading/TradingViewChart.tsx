'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  HistogramData,
  LineStyle,
  IPriceLine,
} from 'lightweight-charts';
import { marketService } from '../../services/market.service';
import { getSocket } from '../../lib/socket';
import { CoinInfoDrawer } from './CoinInfoDrawer';
import { Activity, Maximize2, Minimize2, LineChart, CandlestickChart } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  positions?: any[];
}

const INTERVALS = [
  { label: '1m',  api: '1m',  limit: 1000 },
  { label: '5m',  api: '5m',  limit: 1000 },
  { label: '15m', api: '15m', limit: 1000 },
  { label: '1h',  api: '1h',  limit: 1000 },
  { label: '4h',  api: '4h',  limit: 1000 },
  { label: '1d',  api: '1d',  limit: 1000 },
  { label: '1W',  api: '1w',  limit: 300  },
];

function formatSmartPrice(price: number): string {
  if (!price || isNaN(price)) return '0.00';
  if (price < 0.00001) return price.toFixed(8);
  if (price < 0.001) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

function calculateSMA(data: { time: UTCTimestamp; close: number }[], period: number) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateBollingerBands(data: { time: UTCTimestamp; close: number }[], period = 20, mult = 2) {
  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - sma, 2);
    }
    const stdDev = Math.sqrt(variance / period);

    middle.push({ time: data[i].time, value: sma });
    upper.push({ time: data[i].time, value: sma + stdDev * mult });
    lower.push({ time: data[i].time, value: sma - stdDev * mult });
  }

  return { upper, middle, lower };
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, positions = [] }) => {
  const containerRef    = useRef<HTMLDivElement>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const seriesRef       = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const ma7Ref          = useRef<ISeriesApi<'Line'> | null>(null);
  const ma25Ref         = useRef<ISeriesApi<'Line'> | null>(null);
  const ma99Ref         = useRef<ISeriesApi<'Line'> | null>(null);

  const bollUpperRef    = useRef<ISeriesApi<'Line'> | null>(null);
  const bollMidRef      = useRef<ISeriesApi<'Line'> | null>(null);
  const bollLowerRef    = useRef<ISeriesApi<'Line'> | null>(null);

  const priceLinesRef   = useRef<IPriceLine[]>([]);

  const initialisedRef  = useRef(false);
  const [activeInterval, setActiveInterval] = useState('5m');
  const [chartType, setChartType]           = useState<'CANDLE' | 'AREA'>('CANDLE');
  const [isFullscreen, setIsFullscreen]     = useState(false);

  const [legend, setLegend] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct: number;
    ma7?: number;
    ma25?: number;
    ma99?: number;
  } | null>(null);

  const [showMA7, setShowMA7]   = useState(true);
  const [showMA25, setShowMA25] = useState(true);
  const [showMA99, setShowMA99] = useState(true);
  const [showVOL, setShowVOL]   = useState(true);
  const [showBOLL, setShowBOLL] = useState(false);

  const rawDataRef = useRef<{ time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number }[]>([]);

  const baseAsset = symbol.replace('USDT', '');
  const formattedSymbol = `${baseAsset}/USDT`;

  const isMicro = symbol.includes('PEPE') || symbol.includes('SHIB') || symbol.includes('FLOKI') || symbol.includes('BONK') || symbol.includes('BOME') || symbol.includes('MEW') || symbol.includes('TURBO');
  const isSmall = symbol.includes('ADA') || symbol.includes('XRP') || symbol.includes('DOGE') || symbol.includes('SUI') || symbol.includes('TRX') || symbol.includes('SEI') || symbol.includes('ALGO') || symbol.includes('XLM') || symbol.includes('MATIC');
  const precision = isMicro ? 8 : isSmall ? 4 : 2;
  const minMove = isMicro ? 0.00000001 : isSmall ? 0.0001 : 0.01;

  // ── 1. Create chart canvas ONCE on mount ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initialisedRef.current) return;
    initialisedRef.current = true;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#848e9c',
      },
      grid: {
        vertLines: { color: '#2b313a' },
        horzLines: { color: '#2b313a' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#2b313a' },
      timeScale: {
        borderColor: '#2b313a',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      width: containerRef.current.clientWidth,
      height: isFullscreen ? window.innerHeight - 100 : 440,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const ma7Series  = chart.addLineSeries({ color: '#F0B90B', lineWidth: 1, title: 'MA7' });
    const ma25Series = chart.addLineSeries({ color: '#E040FB', lineWidth: 1, title: 'MA25' });
    const ma99Series = chart.addLineSeries({ color: '#00E5FF', lineWidth: 1, title: 'MA99' });

    const bollUpperSeries = chart.addLineSeries({ color: '#2962FF', lineWidth: 1, title: 'BOLL Upper' });
    const bollMidSeries   = chart.addLineSeries({ color: '#FF6D00', lineWidth: 1, title: 'BOLL Mid' });
    const bollLowerSeries = chart.addLineSeries({ color: '#2962FF', lineWidth: 1, title: 'BOLL Lower' });

    chartRef.current        = chart;
    seriesRef.current       = series as any;
    volumeSeriesRef.current = volumeSeries;
    ma7Ref.current          = ma7Series;
    ma25Ref.current         = ma25Series;
    ma99Ref.current         = ma99Series;
    bollUpperRef.current    = bollUpperSeries;
    bollMidRef.current      = bollMidSeries;
    bollLowerRef.current    = bollLowerSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !seriesRef.current) return;
      const bar = param.seriesData.get(seriesRef.current as any) as any;
      if (bar) {
        const changePct = bar.open > 0 ? ((bar.close - bar.open) / bar.open) * 100 : 0;
        const ma7Val = ma7Series ? (param.seriesData.get(ma7Series) as any)?.value : undefined;
        const ma25Val = ma25Series ? (param.seriesData.get(ma25Series) as any)?.value : undefined;
        const ma99Val = ma99Series ? (param.seriesData.get(ma99Series) as any)?.value : undefined;

        setLegend({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 10,
          changePct: Math.round(changePct * 100) / 100,
          ma7: ma7Val,
          ma25: ma25Val,
          ma99: ma99Val,
        });
      }
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current        = null;
      seriesRef.current       = null;
      volumeSeriesRef.current = null;
      ma7Ref.current          = null;
      ma25Ref.current         = null;
      ma99Ref.current         = null;
      bollUpperRef.current    = null;
      bollMidRef.current      = null;
      bollLowerRef.current    = null;
      initialisedRef.current  = false;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });
  }, [symbol, precision, minMove]);

  // ── 2. Render Interactive On-Chart Price Lines ──────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch (_) {}
    });
    priceLinesRef.current = [];

    const activePositions = positions.filter(
      (p) => p.marketId === symbol || p.symbol === symbol
    );

    activePositions.forEach((pos) => {
      const isLong = pos.side === 'LONG';
      const entryPrice = parseFloat(pos.entryPrice);
      const liqPrice = parseFloat(pos.liquidationPrice || pos.liqPrice || '0');
      const tp = parseFloat(pos.takeProfit || '0');
      const sl = parseFloat(pos.stopLoss || '0');
      const posSize = parseFloat(pos.size || '0');
      const lev = pos.leverage || 10;

      if (entryPrice > 0) {
        const entryLine = series.createPriceLine({
          price: entryPrice,
          color: isLong ? '#0ecb81' : '#f6465d',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `[${pos.side} ${lev}x] ${posSize} ${baseAsset} @ $${formatSmartPrice(entryPrice)}`,
        });
        priceLinesRef.current.push(entryLine);
      }

      if (liqPrice > 0) {
        const liqLine = series.createPriceLine({
          price: liqPrice,
          color: '#ff0055',
          lineWidth: 1,
          lineStyle: LineStyle.LargeDashed,
          axisLabelVisible: true,
          title: `[EST LIQ] $${formatSmartPrice(liqPrice)}`,
        });
        priceLinesRef.current.push(liqLine);
      }

      if (tp > 0) {
        const tpLine = series.createPriceLine({
          price: tp,
          color: '#00e676',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `[TP] $${formatSmartPrice(tp)}`,
        });
        priceLinesRef.current.push(tpLine);
      }

      if (sl > 0) {
        const slLine = series.createPriceLine({
          price: sl,
          color: '#ff1744',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `[SL] $${formatSmartPrice(sl)}`,
        });
        priceLinesRef.current.push(slLine);
      }
    });
  }, [positions, symbol, baseAsset, precision]);

  // ── 3. Load historical OHLCV ────────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    let cancelled = false;

    marketService
      .getKlines(symbol, activeInterval, 1000)
      .then((res) => {
        if (cancelled || !res.bars || res.bars.length === 0 || !seriesRef.current) return;

        const seen = new Set<number>();
        const bars: CandlestickData[] = [];
        const rawList: any[] = [];

        for (const b of res.bars) {
          if (!seen.has(b.time)) {
            seen.add(b.time);
            const time = b.time as UTCTimestamp;
            bars.push({ time, open: b.open, high: b.high, low: b.low, close: b.close });
            rawList.push({ time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
          }
        }
        bars.sort((a, b) => (a.time as number) - (b.time as number));
        rawList.sort((a, b) => (a.time as number) - (b.time as number));

        rawDataRef.current = rawList;
        seriesRef.current.setData(bars);

        if (rawList.length > 0) {
          const last = rawList[rawList.length - 1];
          const changePct = last.open > 0 ? ((last.close - last.open) / last.open) * 100 : 0;
          setLegend({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume || 10,
            changePct: Math.round(changePct * 100) / 100,
          });
        }

        updateIndicators(rawList);
      })
      .catch((e) => console.error('[Chart] Failed to load klines:', e));

    return () => { cancelled = true; };
  }, [symbol, activeInterval]);

  const updateIndicators = (data: { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number }[]) => {
    if (data.length === 0) return;

    if (showMA7 && ma7Ref.current) ma7Ref.current.setData(calculateSMA(data, 7));
    else ma7Ref.current?.setData([]);

    if (showMA25 && ma25Ref.current) ma25Ref.current.setData(calculateSMA(data, 25));
    else ma25Ref.current?.setData([]);

    if (showMA99 && ma99Ref.current) ma99Ref.current.setData(calculateSMA(data, 99));
    else ma99Ref.current?.setData([]);

    if (showVOL && volumeSeriesRef.current) {
      const volBars: HistogramData[] = data.map((b) => ({
        time: b.time,
        value: b.volume || 10,
        color: b.close >= b.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
      }));
      volumeSeriesRef.current.setData(volBars);
    } else {
      volumeSeriesRef.current?.setData([]);
    }

    if (showBOLL && bollUpperRef.current && bollMidRef.current && bollLowerRef.current) {
      const { upper, middle, lower } = calculateBollingerBands(data, 20, 2);
      bollUpperRef.current.setData(upper);
      bollMidRef.current.setData(middle);
      bollLowerRef.current.setData(lower);
    } else {
      bollUpperRef.current?.setData([]);
      bollMidRef.current?.setData([]);
      bollLowerRef.current?.setData([]);
    }
  };

  useEffect(() => {
    if (rawDataRef.current.length > 0) {
      updateIndicators(rawDataRef.current);
    }
  }, [showMA7, showMA25, showMA99, showVOL, showBOLL]);

  // ── 4. Realtime WebSocket updates ──────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    const channel = `market:${symbol}:kline:${activeInterval}`;

    socket.emit('subscribe', channel);

    const onUpdate = (payload: any) => {
      if (payload.channel !== channel || !seriesRef.current) return;

      const k = payload.data;
      const bar: CandlestickData = {
        time:  k.openTime as UTCTimestamp,
        open:  k.open,
        high:  k.high,
        low:   k.low,
        close: k.close,
      };
      seriesRef.current.update(bar);

      if (showVOL && volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: k.openTime as UTCTimestamp,
          value: k.volume || 10,
          color: k.close >= k.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)',
        });
      }

      const changePct = k.open > 0 ? ((k.close - k.open) / k.open) * 100 : 0;
      setLegend((prev) => ({
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume || 10,
        changePct: Math.round(changePct * 100) / 100,
        ma7: prev?.ma7,
        ma25: prev?.ma25,
        ma99: prev?.ma99,
      }));
    };

    socket.on('update', onUpdate);

    return () => {
      socket.off('update', onUpdate);
      socket.emit('unsubscribe', channel);
    };
  }, [symbol, activeInterval, showVOL]);

  return (
    <div className={`flex flex-col w-full bg-[#181a20] relative overflow-hidden font-sans select-none ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''}`}>
      {/* Top Pro Toolbar: Timeframes, Chart Types, Indicators & Coin Info Drawer */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[#2b313a] bg-[#14181d] z-20 relative">
        <div className="flex items-center space-x-2">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-1">
            {INTERVALS.map((iv) => (
              <button
                key={iv.label}
                onClick={() => setActiveInterval(iv.api)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                  activeInterval === iv.api
                    ? 'bg-yellow-400 text-black shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-[#2b313a]'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#2b313a] mx-1" />

          {/* Chart Style Switcher (Candles vs Area Line) */}
          <div className="flex items-center space-x-1 bg-[#181a20] p-0.5 rounded border border-[#2b313a]">
            <button
              onClick={() => setChartType('CANDLE')}
              title="Candlestick Chart"
              className={`p-1 rounded text-xs font-bold transition ${chartType === 'CANDLE' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              <CandlestickChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('AREA')}
              title="Area Line Chart"
              className={`p-1 rounded text-xs font-bold transition ${chartType === 'AREA' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Technical Indicators, Coin Deep Info Drawer & Fullscreen Toggle */}
        <div className="flex items-center space-x-2 text-xs font-mono mt-1 sm:mt-0">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-500 font-sans font-semibold mr-1 flex items-center">
              <Activity className="w-3 h-3 mr-1 text-yellow-400" /> Indicators:
            </span>
            <button
              onClick={() => setShowMA7(!showMA7)}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition ${
                showMA7 ? 'bg-amber-400/20 text-amber-400 border-amber-400/50' : 'bg-[#181a20] text-gray-500 border-[#2b313a]'
              }`}
            >
              MA7
            </button>
            <button
              onClick={() => setShowMA25(!showMA25)}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition ${
                showMA25 ? 'bg-purple-400/20 text-purple-400 border-purple-400/50' : 'bg-[#181a20] text-gray-500 border-[#2b313a]'
              }`}
            >
              MA25
            </button>
            <button
              onClick={() => setShowMA99(!showMA99)}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition ${
                showMA99 ? 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50' : 'bg-[#181a20] text-gray-500 border-[#2b313a]'
              }`}
            >
              MA99
            </button>
            <button
              onClick={() => setShowVOL(!showVOL)}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition ${
                showVOL ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/50' : 'bg-[#181a20] text-gray-500 border-[#2b313a]'
              }`}
            >
              VOL
            </button>
            <button
              onClick={() => setShowBOLL(!showBOLL)}
              className={`px-2 py-0.5 rounded border text-[11px] font-bold transition ${
                showBOLL ? 'bg-blue-400/20 text-blue-400 border-blue-400/50' : 'bg-[#181a20] text-gray-500 border-[#2b313a]'
              }`}
            >
              BOLL
            </button>
          </div>

          <div className="h-4 w-px bg-[#2b313a]" />

          {/* Deep Coin Info Overview Drawer Button */}
          <CoinInfoDrawer symbol={symbol} />

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2b313a] transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Technical Analysis'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-yellow-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Clean Non-Overlapping Sub-Header Legend Bar for OHLCV & Technical Moving Averages */}
      <div className="px-3 py-1.5 bg-[#14181d]/90 border-b border-[#2b313a]/50 flex flex-wrap items-center space-x-3 text-xs font-mono text-gray-300 z-10 relative">
        <span className="font-bold text-white">{formattedSymbol} · {activeInterval}</span>
        {legend && (
          <>
            <span>O: <span className="text-white font-semibold">${formatSmartPrice(legend.open)}</span></span>
            <span>H: <span className="text-white font-semibold">${formatSmartPrice(legend.high)}</span></span>
            <span>L: <span className="text-white font-semibold">${formatSmartPrice(legend.low)}</span></span>
            <span>C: <span className={legend.changePct >= 0 ? 'text-[#0ecb81] font-bold' : 'text-[#f6465d] font-bold'}>${formatSmartPrice(legend.close)}</span></span>
            <span className={legend.changePct >= 0 ? 'text-[#0ecb81] font-bold' : 'text-[#f6465d] font-bold'}>
              {legend.changePct >= 0 ? '+' : ''}{legend.changePct}%
            </span>
            <span>Vol: <span className="text-yellow-400 font-semibold">{legend.volume.toFixed(2)}</span></span>

            {showMA7 && legend.ma7 && (
              <span className="text-amber-400 font-semibold">MA7: ${formatSmartPrice(legend.ma7)}</span>
            )}
            {showMA25 && legend.ma25 && (
              <span className="text-purple-400 font-semibold">MA25: ${formatSmartPrice(legend.ma25)}</span>
            )}
            {showMA99 && legend.ma99 && (
              <span className="text-cyan-400 font-semibold">MA99: ${formatSmartPrice(legend.ma99)}</span>
            )}
          </>
        )}
      </div>

      {/* Prominent High-Visibility APEX CEX Watermark Logo in Chart Canvas Background Center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0 opacity-30">
        <div className="flex items-center space-x-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-4xl shadow-2xl glow-yellow">
            ⚡
          </div>
          <div className="text-left font-mono">
            <div className="text-5xl font-extrabold tracking-widest text-white drop-shadow-md">APEX CEX</div>
            <div className="text-base font-extrabold tracking-widest text-yellow-400">{formattedSymbol} PERPETUAL</div>
          </div>
        </div>
      </div>

      {/* Chart Canvas with Transparent Background so Watermark Logo Shines Through */}
      <div ref={containerRef} className="w-full relative z-10" style={{ height: isFullscreen ? window.innerHeight - 100 : 410 }} />
    </div>
  );
};
