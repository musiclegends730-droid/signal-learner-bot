import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useListSignals,
  useGetSignalStats,
  useGetWeights,
  useListAssets,
  useGenerateSignal,
  useUpdateSignalResult,
  getListSignalsQueryKey,
  getGetSignalStatsQueryKey,
  getGetWeightsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Crosshair,
  Layers,
  LineChart,
  Plus,
  Settings2,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Timer,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Signal } from "@workspace/api-client-react";

type SignalIndicators = Record<string, { direction: string; value: number; confidence: number }>;

const FALLBACK_ASSETS = ["BTC-USD", "ETH-USD", "EUR/USD", "GBP/USD", "AAPL", "TSLA"];
const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

const EXPIRY_MAP: Record<string, string> = {
  "1m":  "1 min",
  "5m":  "5 min",
  "15m": "15 min",
  "30m": "30 min",
  "1h":  "1 hour",
  "4h":  "4 hours",
  "1d":  "End of Day"
};

function formatIndicatorName(name: string) {
  const map: Record<string, string> = {
    rsi: "RSI",
    macd: "MACD",
    bollingerBands: "Bollinger Bands",
    emaCross: "EMA Cross",
    stochastic: "Stochastic",
    priceAction: "Price Action",
    atr: "ATR",
    williamsR: "Williams %R",
    cci: "CCI",
    adx: "ADX",
    obv: "OBV",
    parabolicSar: "Parabolic SAR",
    roc: "ROC",
    mfi: "MFI",
    donchianChannel: "Donchian Channel",
    ichimoku: "Ichimoku"
  };
  return map[name] || name;
}

function buildVoteChartData(indicators: SignalIndicators) {
  return Object.entries(indicators).map(([key, ind]) => {
    const raw = ind.direction === "BUY" ? ind.confidence : ind.direction === "SELL" ? -ind.confidence : 0;
    return {
      name: formatIndicatorName(key),
      value: raw,
      direction: ind.direction,
      confidence: ind.confidence,
      rawValue: typeof ind.value === "number" ? ind.value : 0
    };
  }).sort((a, b) => b.value - a.value);
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border p-3 text-xs font-mono shadow-lg">
        <p className="font-bold uppercase text-foreground mb-1">{d.name}</p>
        <p className={`${d.direction === 'BUY' ? 'text-success' : d.direction === 'SELL' ? 'text-destructive' : 'text-muted-foreground'} uppercase font-bold`}>
          {d.direction}
        </p>
        <p className="text-muted-foreground">Confidence: {d.confidence}%</p>
        <p className="text-muted-foreground">Value: {d.rawValue.toFixed(4)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<string>("EUR/USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("5m");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(null);

  const { data: signals = [], isLoading: isSignalsLoading } = useListSignals({
    query: {
      enabled: !!token,
      queryKey: getListSignalsQueryKey(),
      refetchInterval: 30000
    }
  });

  const { data: stats } = useGetSignalStats({
    query: {
      enabled: !!token,
      queryKey: getGetSignalStatsQueryKey(),
      refetchInterval: 30000
    }
  });

  const { data: weights = [], isLoading: isWeightsLoading } = useGetWeights({
    query: {
      enabled: !!token,
      queryKey: getGetWeightsQueryKey(),
      refetchInterval: 30000
    }
  });

  const { data: assets = FALLBACK_ASSETS } = useListAssets({
    query: { enabled: !!token, staleTime: Infinity }
  });

  const generateMutation = useGenerateSignal();
  const updateResultMutation = useUpdateSignalResult();

  const handleGenerate = async () => {
    if (!selectedAsset) return;
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        data: { asset: selectedAsset, timeframe: selectedTimeframe }
      });
      queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      setSelectedSignalId(result.id);
      toast({
        title: "Signal Ready",
        description: `${selectedAsset} — ${result.action} @ ${result.price} | Conf: ${result.confidence}%`
      });
    } catch (e: any) {
      toast({
        title: "Analysis Failed",
        description: e.message || "Could not fetch market data. Try another asset.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateResult = async (id: number, result: "WIN" | "LOSS") => {
    try {
      await updateResultMutation.mutateAsync({ id, data: { result } });
      queryClient.setQueryData(getListSignalsQueryKey(), (old: Signal[] | undefined) => {
        if (!old) return old;
        return old.map(s => s.id === id ? { ...s, result } : s);
      });
      queryClient.invalidateQueries({ queryKey: getGetSignalStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWeightsQueryKey() });
      toast({
        title: result === "WIN" ? "Win Logged!" : "Loss Logged",
        description: "AI model updated with this trade result."
      });
    } catch (e: any) {
      toast({
        title: "Update Failed",
        description: e.message || "Could not save result.",
        variant: "destructive"
      });
    }
  };

  const pendingSignals = signals.filter(s => s.result === "PENDING" || !s.result);
  const completedSignals = signals.filter(s => s.result === "WIN" || s.result === "LOSS");
  const selectedSignal = signals.find(s => s.id === selectedSignalId) || (signals.length > 0 ? signals[0] : null);
  const indicators = selectedSignal?.indicators as SignalIndicators | undefined;
  const chartData = indicators ? buildVoteChartData(indicators) : [];

  const buyVotes = chartData.filter(d => d.direction === "BUY").length;
  const sellVotes = chartData.filter(d => d.direction === "SELL").length;
  const neutralVotes = chartData.filter(d => d.direction === "NEUTRAL").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* LEFT: Controls */}
      <div className="lg:col-span-3 space-y-5 flex flex-col">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border p-4">
            <span className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Win Rate
            </span>
            <span className="text-3xl font-bold text-foreground">
              {stats ? `${(stats.winRate * 100).toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="bg-card border border-border p-4">
            <span className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Avg Conf
            </span>
            <span className="text-3xl font-bold text-foreground">
              {stats ? `${Math.round(stats.currentConfidence)}%` : "—"}
            </span>
          </div>
          <div className="bg-card border border-border p-4 col-span-2">
            <span className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Trades Analysed
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{stats?.totalSignals ?? 0}</span>
              <div className="flex gap-2 text-xs">
                <span className="text-success">{stats?.wins ?? 0}W</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-destructive">{stats?.losses ?? 0}L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Generator */}
        <div className="bg-card border border-border">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Pocket Option Signal
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-muted-foreground">Asset / Pair</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="rounded-none border-border bg-background h-10">
                  <SelectValue placeholder="Select Asset" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  {assets.map(a => (
                    <SelectItem key={a} value={a} className="rounded-none font-mono">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase text-muted-foreground">
                Contract Duration / Expiry
              </label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="rounded-none border-border bg-background h-10">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  {TIMEFRAMES.map(t => (
                    <SelectItem key={t} value={t} className="rounded-none font-mono">
                      {t} — {EXPIRY_MAP[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-background border border-border/50 text-[10px] text-muted-foreground uppercase space-y-1">
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="text-primary font-bold">Pocket Option</span>
              </div>
              <div className="flex justify-between">
                <span>Suggested Expiry</span>
                <span className="text-foreground font-bold">{EXPIRY_MAP[selectedTimeframe]}</span>
              </div>
              <div className="flex justify-between">
                <span>Indicators</span>
                <span className="text-foreground font-bold">16 active</span>
              </div>
            </div>

            <Button
              className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase h-12 tracking-widest"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedAsset}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2 animate-pulse">
                  <Activity className="w-4 h-4" /> Scanning Market...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Analyse Signal
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ML Weights */}
        <div className="bg-card border border-border flex-1 flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              AI Model Weights
            </h2>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 border border-border">16 IND</span>
          </div>
          <div className="p-4 flex-1 overflow-auto space-y-3">
            {isWeightsLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4 uppercase">Initializing model...</p>
            ) : weights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 uppercase">Mark trade results to train AI</p>
            ) : (
              [...weights].sort((a, b) => Number(b.weight) - Number(a.weight)).map(w => {
                const wn = Number(w.weight);
                const acc = w.totalPredictions > 0 ? (w.correctPredictions / w.totalPredictions) * 100 : 0;
                return (
                  <div key={w.name} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="uppercase">{formatIndicatorName(w.name)}</span>
                      <span className="text-primary font-bold">{(wn * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-background border border-border overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, wn * 100 * 3)}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {w.correctPredictions}/{w.totalPredictions} ({acc.toFixed(0)}% acc)
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CENTER: Signal Feed */}
      <div className="lg:col-span-4 bg-card border border-border flex flex-col h-[calc(100vh-6rem)]">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            Signal Feed
          </h2>
        </div>

        <Tabs defaultValue="pending" className="flex flex-col flex-1">
          <TabsList className="grid grid-cols-2 rounded-none border-b border-border bg-transparent h-12 p-0">
            <TabsTrigger value="pending" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary uppercase text-xs tracking-wider">
              Active ({pendingSignals.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary uppercase text-xs tracking-wider">
              History ({completedSignals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 overflow-auto p-0 m-0">
            {isSignalsLoading ? (
              <p className="text-xs text-muted-foreground uppercase text-center py-8">Fetching feed...</p>
            ) : pendingSignals.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground uppercase">Generate a signal to begin trading</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingSignals.map(signal => (
                  <div
                    key={signal.id}
                    onClick={() => setSelectedSignalId(signal.id)}
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors ${selectedSignalId === signal.id ? 'bg-muted/30 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-base font-bold font-mono">{signal.asset}</span>
                        <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
                          <Clock className="w-2.5 h-2.5 inline mr-1" />
                          {format(new Date(signal.createdAt), "HH:mm:ss")} • Expiry: {EXPIRY_MAP[signal.timeframe] || signal.timeframe}
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 border font-bold text-sm flex items-center gap-1 ${signal.action === 'BUY' ? 'border-success text-success bg-success/10' : 'border-destructive text-destructive bg-destructive/10'}`}>
                        {signal.action === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {signal.action === 'BUY' ? 'CALL ↑' : 'PUT ↓'}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                        <span>Confidence</span>
                        <span className="text-primary font-bold">{signal.confidence}%</span>
                      </div>
                      <Progress value={signal.confidence} className="h-1.5 rounded-none bg-background" />
                    </div>

                    <div className="text-[10px] text-muted-foreground uppercase mb-3 font-mono">
                      Entry @ {signal.price}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-none border-success/40 text-success hover:bg-success hover:text-success-foreground uppercase text-[10px] h-8"
                        onClick={(e) => { e.stopPropagation(); handleUpdateResult(signal.id, "WIN"); }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Won
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-none border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground uppercase text-[10px] h-8"
                        onClick={(e) => { e.stopPropagation(); handleUpdateResult(signal.id, "LOSS"); }}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Lost
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto p-0 m-0">
            <div className="divide-y divide-border">
              {completedSignals.map(signal => (
                <div
                  key={signal.id}
                  onClick={() => setSelectedSignalId(signal.id)}
                  className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${selectedSignalId === signal.id ? 'bg-muted/30 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono">{signal.asset}</span>
                        <span className={`text-[10px] font-bold px-1 ${signal.action === 'BUY' ? 'text-success' : 'text-destructive'}`}>
                          {signal.action === 'BUY' ? 'CALL' : 'PUT'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {format(new Date(signal.createdAt), "MM/dd HH:mm")} • {EXPIRY_MAP[signal.timeframe] || signal.timeframe}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`rounded-none uppercase font-bold text-[10px] px-2 ${signal.result === 'WIN' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                        {signal.result}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{signal.confidence}% conf</span>
                    </div>
                  </div>
                </div>
              ))}
              {completedSignals.length === 0 && (
                <p className="text-xs text-muted-foreground uppercase text-center py-8">No trade history yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* RIGHT: Indicator Vote Chart */}
      <div className="lg:col-span-5 bg-card border border-border h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
        {selectedSignal ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-border bg-muted/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold font-mono">{selectedSignal.asset}</h2>
                    <Badge variant="outline" className="rounded-none font-mono text-[10px] uppercase border-primary text-primary">
                      {selectedSignal.timeframe}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {format(new Date(selectedSignal.createdAt), "MMM dd, yyyy • HH:mm:ss")}
                  </p>
                </div>
                <div className={`px-5 py-3 border flex flex-col items-center ${selectedSignal.action === 'BUY' ? 'border-success text-success bg-success/10' : 'border-destructive text-destructive bg-destructive/10'}`}>
                  <span className="text-[9px] uppercase font-bold opacity-70 mb-0.5">
                    {selectedSignal.action === 'BUY' ? 'CALL (UP)' : 'PUT (DOWN)'}
                  </span>
                  <span className="text-2xl font-bold">
                    {selectedSignal.action === 'BUY' ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-background border border-border">
                  <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Entry Price</span>
                  <span className="text-sm font-mono font-bold">{selectedSignal.price}</span>
                </div>
                <div className="p-2.5 bg-background border border-border">
                  <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">AI Confidence</span>
                  <span className="text-sm font-mono font-bold text-primary">{selectedSignal.confidence}%</span>
                </div>
                <div className="p-2.5 bg-background border border-border">
                  <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Expiry</span>
                  <span className="text-sm font-mono font-bold flex items-center gap-1">
                    <Timer className="w-3 h-3 text-warning" />
                    {EXPIRY_MAP[selectedSignal.timeframe] || selectedSignal.timeframe}
                  </span>
                </div>
              </div>
            </div>

            {/* Vote summary bar */}
            {chartData.length > 0 && (
              <div className="px-5 py-3 border-b border-border flex items-center gap-3">
                <span className="text-[10px] uppercase text-muted-foreground whitespace-nowrap">Consensus</span>
                <div className="flex-1 h-3 bg-background border border-border overflow-hidden flex">
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: `${(buyVotes / 16) * 100}%` }}
                    title={`${buyVotes} CALL votes`}
                  />
                  <div
                    className="h-full bg-muted"
                    style={{ width: `${(neutralVotes / 16) * 100}%` }}
                    title={`${neutralVotes} neutral`}
                  />
                  <div
                    className="h-full bg-destructive transition-all"
                    style={{ width: `${(sellVotes / 16) * 100}%` }}
                    title={`${sellVotes} PUT votes`}
                  />
                </div>
                <div className="flex gap-3 text-[10px] font-mono whitespace-nowrap">
                  <span className="text-success">↑{buyVotes}</span>
                  <span className="text-muted-foreground">={neutralVotes}</span>
                  <span className="text-destructive">↓{sellVotes}</span>
                </div>
              </div>
            )}

            {/* Waterfall chart */}
            <div className="flex-1 overflow-auto p-0">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Crosshair className="w-3 h-3" />
                  16-Indicator Vote Breakdown
                </h3>
                <span className="text-[10px] text-muted-foreground">← PUT | CALL →</span>
              </div>

              {chartData.length > 0 ? (
                <div className="px-2 py-4" style={{ height: `${chartData.length * 38 + 24}px`, minHeight: "500px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                      barSize={20}
                    >
                      <XAxis
                        type="number"
                        domain={[-100, 100]}
                        tickFormatter={(v) => `${Math.abs(v)}%`}
                        tick={{ fontSize: 9, fill: "#6b7280", fontFamily: "monospace" }}
                        axisLine={{ stroke: "#1f2937" }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 9, fill: "#9ca3af", fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <ReferenceLine x={0} stroke="#374151" strokeWidth={1} />
                      <Bar dataKey="value" radius={0} minPointSize={2}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.direction === "BUY"
                                ? "hsl(142 71% 45%)"
                                : entry.direction === "SELL"
                                ? "hsl(0 84% 60%)"
                                : "hsl(220 10% 28%)"
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="direction"
                          position="insideRight"
                          style={{ fontSize: 8, fontFamily: "monospace", fill: "rgba(255,255,255,0.6)", fontWeight: "bold" }}
                          formatter={(v: string) => v === "NEUTRAL" ? "" : v}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-xs uppercase">
                  No indicator data available
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-8 text-center">
            <BarChart3 className="w-16 h-16 mb-4 opacity-15" />
            <p className="text-sm uppercase tracking-widest font-bold opacity-40 mb-2">Indicator Vote Chart</p>
            <p className="text-xs opacity-30 uppercase">Generate a signal to see how all 16 indicators voted on your trade</p>
          </div>
        )}
      </div>
    </div>
  );
}
