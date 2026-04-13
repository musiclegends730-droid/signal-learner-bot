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
  Activity, 
  ArrowDownRight, 
  ArrowUpRight, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Crosshair, 
  History, 
  Layers, 
  LineChart, 
  Plus, 
  Settings2, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Signal, IndicatorWeight } from "@workspace/api-client-react";

type SignalIndicators = Record<string, { direction: string; value: number; confidence: number }>;

// Fallback assets if API fails
const FALLBACK_ASSETS = ["BTC/USD", "ETH/USD", "EUR/USD", "GBP/USD", "AAPL", "TSLA"];
const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

const INDICATOR_NAMES = [
  "rsi", "macd", "bollingerBands", "emaCross", "stochastic", 
  "priceAction", "atr", "williamsR", "cci", "adx", 
  "obv", "parabolicSar", "roc", "mfi", "donchianChannel", "ichimoku"
];

function formatIndicatorName(name: string) {
  // Convert camelCase to Title Case
  const result = name.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export default function Dashboard() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC/USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15m");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(null);

  const { data: signals = [], isLoading: isSignalsLoading } = useListSignals({
    query: {
      enabled: !!token,
      queryKey: getListSignalsQueryKey(),
      refetchInterval: 30000,
    }
  });

  const { data: stats, isLoading: isStatsLoading } = useGetSignalStats({
    query: {
      enabled: !!token,
      queryKey: getGetSignalStatsQueryKey(),
      refetchInterval: 30000,
    }
  });

  const { data: weights = [], isLoading: isWeightsLoading } = useGetWeights({
    query: {
      enabled: !!token,
      queryKey: getGetWeightsQueryKey(),
      refetchInterval: 30000,
    }
  });

  const { data: assets = FALLBACK_ASSETS } = useListAssets({
    query: {
      enabled: !!token,
      staleTime: Infinity,
    }
  });

  const generateMutation = useGenerateSignal();
  const updateResultMutation = useUpdateSignalResult();

  const handleGenerate = async () => {
    if (!selectedAsset) return;
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({
        data: { asset: selectedAsset, timeframe: selectedTimeframe }
      });
      queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
      toast({
        title: "Signal Generated",
        description: `Successfully analyzed ${selectedAsset} on ${selectedTimeframe} timeframe.`,
      });
    } catch (e: any) {
      toast({
        title: "Generation Failed",
        description: e.message || "An error occurred while generating the signal.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateResult = async (id: number, result: "WIN" | "LOSS") => {
    try {
      await updateResultMutation.mutateAsync({
        id,
        data: { result }
      });
      // Optimistic update
      queryClient.setQueryData(getListSignalsQueryKey(), (old: Signal[] | undefined) => {
        if (!old) return old;
        return old.map(s => s.id === id ? { ...s, result } : s);
      });
      // Invalidate stats and weights since they need recalculation
      queryClient.invalidateQueries({ queryKey: getGetSignalStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWeightsQueryKey() });
      
      toast({
        title: "Result Logged",
        description: `Signal marked as ${result}. Model weights updating.`,
      });
    } catch (e: any) {
      toast({
        title: "Update Failed",
        description: e.message || "Could not save result.",
        variant: "destructive",
      });
    }
  };

  const pendingSignals = signals.filter(s => s.result === "PENDING" || !s.result);
  const completedSignals = signals.filter(s => s.result === "WIN" || s.result === "LOSS");
  
  const selectedSignal = signals.find(s => s.id === selectedSignalId) || (signals.length > 0 ? signals[0] : null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Overview & Generation */}
      <div className="lg:col-span-3 space-y-6 flex flex-col">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border p-4 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Win Rate
            </span>
            <span className="text-3xl font-bold text-foreground">
              {stats ? `${(stats.winRate * 100).toFixed(1)}%` : "0.0%"}
            </span>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Avg Conf
            </span>
            <span className="text-3xl font-bold text-foreground">
              {stats ? `${Math.round(stats.currentConfidence)}%` : "0%"}
            </span>
          </div>
          <div className="bg-card border border-border p-4 flex flex-col justify-center col-span-2">
            <span className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Total Signals Analysed
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-foreground">
                {stats ? stats.totalSignals : 0}
              </span>
              <div className="flex gap-2 text-xs">
                <span className="text-success">{stats ? stats.wins : 0} W</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-destructive">{stats ? stats.losses : 0} L</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIGNAL GENERATOR */}
        <div className="bg-card border border-border">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              New Analysis
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground">Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="rounded-none border-border bg-background h-10">
                  <SelectValue placeholder="Select Asset" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  {assets.map(a => (
                    <SelectItem key={a} value={a} className="rounded-none">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="rounded-none border-border bg-background h-10">
                  <SelectValue placeholder="Select Timeframe" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-border">
                  {TIMEFRAMES.map(t => (
                    <SelectItem key={t} value={t} className="rounded-none">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase h-12"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedAsset}
            >
              {isGenerating ? "Analyzing..." : "Generate Signal"}
            </Button>
          </div>
        </div>

        {/* INDICATOR WEIGHTS (ML MODEL) */}
        <div className="bg-card border border-border flex-1 flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Model Weights
            </h2>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 border border-border">16 INDICATORS</span>
          </div>
          <div className="p-4 flex-1 overflow-auto space-y-3">
            {isWeightsLoading ? (
              <div className="text-xs text-muted-foreground uppercase text-center py-4">Loading model...</div>
            ) : weights.length === 0 ? (
              <div className="text-xs text-muted-foreground uppercase text-center py-4">No model data yet. Result signals to train.</div>
            ) : (
              // Sort by weight descending
              [...weights].sort((a, b) => Number(b.weight) - Number(a.weight)).map(w => {
                const weightNum = Number(w.weight);
                const acc = w.totalPredictions > 0 ? (w.correctPredictions / w.totalPredictions) * 100 : 0;
                
                return (
                  <div key={w.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="uppercase">{formatIndicatorName(w.name)}</span>
                      <span className="text-primary font-bold">{(weightNum * 100).toFixed(1)}% wgt</span>
                    </div>
                    <div className="h-1.5 bg-background border border-border overflow-hidden flex">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min(100, Math.max(0, weightNum * 100 * 3))}%` }} // Multiply by 3 just to make it visible relative to equal 6.25% weight
                      ></div>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-right">
                      {w.correctPredictions}/{w.totalPredictions} acc ({acc.toFixed(0)}%)
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Live Feed */}
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
              Pending ({pendingSignals.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary uppercase text-xs tracking-wider">
              History ({completedSignals.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="flex-1 overflow-auto p-0 m-0">
            {isSignalsLoading ? (
              <div className="text-xs text-muted-foreground uppercase text-center py-8">Fetching feed...</div>
            ) : pendingSignals.length === 0 ? (
              <div className="text-xs text-muted-foreground uppercase text-center py-8 border-b border-border">No pending signals</div>
            ) : (
              <div className="divide-y divide-border">
                {pendingSignals.map(signal => (
                  <div 
                    key={signal.id}
                    onClick={() => setSelectedSignalId(signal.id)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedSignalId === signal.id ? 'bg-muted/50 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold">{signal.asset}</span>
                        <span className="text-xs text-muted-foreground uppercase">{format(new Date(signal.createdAt), "HH:mm:ss")} • {signal.timeframe}</span>
                      </div>
                      <Badge variant="outline" className={`rounded-none uppercase font-bold text-xs px-2 py-0.5 border ${signal.action === 'BUY' ? 'text-success border-success/50 bg-success/10' : 'text-destructive border-destructive/50 bg-destructive/10'}`}>
                        {signal.action === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {signal.action} @ {signal.price}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground uppercase">
                        <span>Model Confidence</span>
                        <span>{signal.confidence}%</span>
                      </div>
                      <Progress value={signal.confidence} className="h-1.5 rounded-none bg-background" />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 rounded-none border-success/30 text-success hover:bg-success hover:text-success-foreground uppercase text-xs"
                        onClick={(e) => { e.stopPropagation(); handleUpdateResult(signal.id, "WIN"); }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Win
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 rounded-none border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground uppercase text-xs"
                        onClick={(e) => { e.stopPropagation(); handleUpdateResult(signal.id, "LOSS"); }}
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Loss
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
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedSignalId === signal.id ? 'bg-muted/50 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold">{signal.asset}</span>
                        <span className={`text-[10px] px-1 font-bold ${signal.action === 'BUY' ? 'text-success' : 'text-destructive'}`}>
                          {signal.action}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground uppercase">{format(new Date(signal.createdAt), "MM/dd HH:mm")}</span>
                    </div>
                    <Badge className={`rounded-none uppercase font-bold text-xs ${signal.result === 'WIN' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                      {signal.result}
                    </Badge>
                  </div>
                </div>
              ))}
              {completedSignals.length === 0 && (
                <div className="text-xs text-muted-foreground uppercase text-center py-8">No historical data</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* RIGHT COLUMN: Detailed Analysis */}
      <div className="lg:col-span-5 bg-card border border-border h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
        {selectedSignal ? (
          <>
            <div className="p-6 border-b border-border bg-muted/10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {selectedSignal.asset}
                    <Badge variant="outline" className="rounded-none font-mono text-xs uppercase border-primary text-primary">
                      {selectedSignal.timeframe}
                    </Badge>
                  </h2>
                  <p className="text-muted-foreground uppercase text-xs mt-1">
                    {format(new Date(selectedSignal.createdAt), "MMM dd, yyyy • HH:mm:ss")}
                  </p>
                </div>
                <div className={`px-4 py-2 border flex flex-col items-center justify-center ${selectedSignal.action === 'BUY' ? 'border-success text-success bg-success/10' : 'border-destructive text-destructive bg-destructive/10'}`}>
                  <span className="text-[10px] uppercase font-bold mb-1 opacity-70">Action</span>
                  <span className="text-xl font-bold">{selectedSignal.action}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="p-3 bg-background border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Entry Price</span>
                  <span className="text-lg font-mono">{selectedSignal.price}</span>
                </div>
                <div className="p-3 bg-background border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">Confidence</span>
                  <span className="text-lg font-mono text-primary">{selectedSignal.confidence}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center sticky top-0 backdrop-blur-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Crosshair className="w-3 h-3" />
                  16-Indicator Consensus
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedSignal.indicators && Object.entries(selectedSignal.indicators as Record<string, any>).map(([key, ind]) => {
                    if (!ind) return null;
                    const direction = ind.direction;
                    const val = ind.value;
                    const conf = ind.confidence || 0;
                    
                    let dirColor = "text-muted-foreground";
                    let DirIcon = Activity;
                    
                    if (direction === "BUY") {
                      dirColor = "text-success";
                      DirIcon = ArrowUpRight;
                    } else if (direction === "SELL") {
                      dirColor = "text-destructive";
                      DirIcon = ArrowDownRight;
                    }

                    return (
                      <div key={key} className="border border-border p-3 flex flex-col gap-2 hover:bg-muted/10 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase font-bold text-muted-foreground">
                            {formatIndicatorName(key)}
                          </span>
                          <span className={`text-xs font-bold uppercase flex items-center ${dirColor}`}>
                            {direction} <DirIcon className="w-3 h-3 ml-1" />
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-end mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase">Value</span>
                            <span className="text-sm font-mono">{typeof val === 'number' ? val.toFixed(4) : val}</span>
                          </div>
                          <div className="flex flex-col items-end w-1/2">
                            <span className="text-[10px] text-muted-foreground uppercase mb-1">Conf: {conf}%</span>
                            <Progress value={conf} className="h-1 rounded-none bg-background w-full" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedSignal.indicators || Object.keys(selectedSignal.indicators).length === 0) && (
                    <div className="col-span-2 text-center text-xs text-muted-foreground uppercase py-8">
                      Indicator breakdown unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm uppercase tracking-widest font-bold opacity-50">Select a signal to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
