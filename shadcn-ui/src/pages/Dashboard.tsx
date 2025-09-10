import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CarbonCalculator } from '../services/carbonCalculator';
import { MLRecommender } from '../services/mlRecommender';
import { CATEGORY_NAMES } from '../config/constants';
import { CarbonCategories, Recommendation } from '../types';
import { TrendingUp, TrendingDown, Users, Lightbulb, Map } from 'lucide-react';
import { ChatBot } from '../components/ChatBot';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// helpers
type Factors = Record<string, Record<string, number>>;

async function loadCSV<T = Record<string, any>>(path: string): Promise<T[]> {
  const res = await fetch(path);
  if (!res.ok) return [];
  const txt = await res.text();
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => {
      const raw = (cols[i] ?? '').trim();
      const num = Number(raw);
      obj[h] = Number.isFinite(num) && raw !== '' ? num : raw;
    });
    return obj as T;
  });
}

interface SurveyData {
  categories: CarbonCategories;
  categoricals?: {
    Diet?: string;
    'Heating Energy Source'?: string;
    Recycling?: string;
    Cooking_With?: string;
    'Social Activity'?: string;
    subdomain?: string;
    city?: string;
    country?: string;
  };
  totalCO2: number;
  timestamp: string;
  location?: { lat?: number; lng?: number; city?: string; country?: string };
}

type SubdomainRow = { subdomain: string; total_co2_median?: number; total_co2_p75?: number; total_co2_count?: number; [k: string]: any };
type CityRow      = { country: string; city: string; total_co2_median?: number; [k: string]: any };
type CountryRow   = { country: string; total_co2_median?: number; [k: string]: any };

export default function Dashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // state
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [factors, setFactors] = useState<Factors>({});
  const [subStats, setSubStats] = useState<SubdomainRow[]>([]);
  const [cityStats, setCityStats] = useState<CityRow[]>([]);
  const [countryStats, setCountryStats] = useState<CountryRow[]>([]);

  // load survey
  useEffect(() => {
    try {
      const raw = localStorage.getItem('carbonSurvey');
      if (!raw) {
        navigate('/survey');
        return;
      }
      const parsed = JSON.parse(raw) as SurveyData;
      setSurveyData(parsed);
      setRecommendations(MLRecommender.getPersonalizedRecommendations(parsed.categories));
    } catch {
      navigate('/survey');
    }
  }, [navigate]);

  // load artifacts
  useEffect(() => {
    (async () => {
      try {
        const [f, s, c1, c2] = await Promise.all([
          fetch('/data/emission_factors.json').then(r => r.json()),
          loadCSV<SubdomainRow>('/data/subdomain_stats.csv'),
          loadCSV<CityRow>('/data/city_stats.csv'),
          loadCSV<CountryRow>('/data/country_stats.csv'),
        ]);
        setFactors(f); setSubStats(s); setCityStats(c1); setCountryStats(c2);
      } catch (e) {
        console.error('artifact load error', e);
      }
    })();
  }, []);

  // animations
  useEffect(() => {
    if (!surveyData) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".dashboard-header",{ opacity: 0, y: -30 },{ opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });
      gsap.fromTo(".dashboard-card",{ opacity: 0, y: 50, scale: 0.9 },{ opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.2, delay: 0.3, ease: "back.out(1.7)" });
      gsap.fromTo(".recommendation-item",{ opacity: 0, x: -30 },{ opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 1, ease: "power2.out" });
    }, containerRef);
    return () => ctx.revert();
  }, [surveyData]);

  // ---------- ALL hooks above this line (no early return before hooks) ----------

  // numeric totals from your calculator (safe defaults)
  const numericBreakdown = useMemo(() => {
    if (!surveyData) return [] as { category: keyof CarbonCategories; co2: number }[];
    return CarbonCalculator.getCategoryBreakdown(surveyData.categories);
  }, [surveyData]);

  const numericTotalOnly = useMemo(() => {
    if (!surveyData) return 0;
    return CarbonCalculator.calculateTotalCO2(surveyData.categories);
  }, [surveyData]);

  // categorical contributions
  const catParts = useMemo(() => {
    if (!surveyData) return [] as { label: string; value: number }[];
    const cats = surveyData.categoricals || {};
    const val = (key: keyof NonNullable<SurveyData['categoricals']>) => {
      const choice = cats[key];
      const map = (factors as any)?.[key];
      const add = choice && map && typeof map[choice] === 'number' ? map[choice] : 0;
      return add as number;
    };
    return [
      { label: 'Diet',     value: val('Diet') },
      { label: 'Heating',  value: val('Heating Energy Source') },
      { label: 'Recycling',value: val('Recycling') },
      { label: 'Cooking',  value: val('Cooking_With') },
      { label: 'Social',   value: val('Social Activity') },
    ].filter(p => p.value > 0);
  }, [surveyData, factors]);

  // combined breakdown for pie
  const combinedForPie = useMemo(() => {
    const nb = numericBreakdown.map((item: any) => ({
      label: CATEGORY_NAMES[item.category] ?? String(item.category),
      value: Number(item.co2 || 0),
    }));
    return [...nb, ...catParts];
  }, [numericBreakdown, catParts]);

  const youTotal = useMemo(() => {
    const catSum = catParts.reduce((a, b) => a + b.value, 0);
    return numericTotalOnly + catSum;
  }, [numericTotalOnly, catParts]);

  const topCombined = useMemo(() => {
    if (combinedForPie.length === 0) return { label: 'Total', pct: 0 };
    const total = combinedForPie.reduce((a, b) => a + b.value, 0) || 1;
    const top = [...combinedForPie].sort((a, b) => b.value - a.value)[0];
    return { label: top.label, pct: (top.value / total) * 100 };
  }, [combinedForPie]);

  // community medians
  const subMedian = useMemo(() => {
    if (!surveyData?.categoricals?.subdomain) return 0;
    const row = subStats.find(r => String(r.subdomain) === String(surveyData.categoricals!.subdomain));
    return Number(row?.total_co2_median || 0);
  }, [subStats, surveyData]);

  const cityMedian = useMemo(() => {
    if (!surveyData?.categoricals?.city || !surveyData?.categoricals?.country) return 0;
    const row = cityStats.find(r =>
      String(r.city) === String(surveyData.categoricals!.city) &&
      String(r.country) === String(surveyData.categoricals!.country)
    );
    return Number(row?.total_co2_median || 0);
  }, [cityStats, surveyData]);

  const countryMedian = useMemo(() => {
    if (!surveyData?.categoricals?.country) return 0;
    const row = countryStats.find(r => String(r.country) === String(surveyData.categoricals!.country));
    return Number(row?.total_co2_median || 0);
  }, [countryStats, surveyData]);

  // chart data
  const pieData = useMemo(() => ({
    labels: combinedForPie.map(p => p.label),
    datasets: [{
      data: combinedForPie.map(p => p.value),
      backgroundColor: ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#84CC16','#F97316','#0EA5E9','#A3E635'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }), [combinedForPie]);

  const barData = useMemo(() => ({
    labels: ['You', surveyData?.categoricals?.city ?? 'City', surveyData?.categoricals?.country ?? 'Country'],
    datasets: [{
      label: 'CO₂ Emissions (kg/month)',
      data: [youTotal, cityMedian, countryMedian],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      borderRadius: 8,
    }],
  }), [youTotal, cityMedian, countryMedian, surveyData]);

  const chartOptions = useMemo(() => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } }), []);

  // early render (AFTER hooks are declared)
  if (!surveyData) {
    return <div className="p-6">Loading…</div>;
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen py-8 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%),
          url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.02'%3E%3Cpath d='M50 50c13.8 0 25-11.2 25-25S63.8 0 50 0 25 11.2 25 25s11.2 25 25 25zm25 25c13.8 0 25-11.2 25-25S88.8 50 75 50 50 61.2 50 75s11.2 25 25 25zM25 75c13.8 0 25-11.2 25-25S38.8 25 25 25 0 36.2 0 50s11.2 25 25 25z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `
      }}
    >
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <div className="dashboard-header text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Carbon Dashboard</h1>
          <p className="text-gray-600 leading-relaxed">
            {surveyData.categoricals?.subdomain || 'User'} • {surveyData.categoricals?.city || 'Your City'}, {surveyData.categoricals?.country || ''}
          </p>
          <p className="mt-1 text-lg"><b>Total:</b> {youTotal.toFixed(1)} kg / month</p>
        </div>

        {/* Top contributor */}
        <Card className="dashboard-card mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Largest Contributor</h3>
                <p className="text-blue-100">
                  <span className="font-bold text-xl">{/* top label */}{
                    (combinedForPie.length ? [...combinedForPie].sort((a,b)=>b.value-a.value)[0].label : '—')
                  }</span>
                  {' '}accounts for <span className="font-bold">{/* top % */}{
                    (combinedForPie.length ? topCombined.pct.toFixed(1) : '0.0')
                  }%</span> of your footprint
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="dashboard-card bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Your Emissions Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Pie data={pieData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Community Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={barData} options={chartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Based on aggregate medians for {surveyData.categoricals?.city}, {surveyData.categoricals?.country}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="dashboard-card mb-8 bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="recommendation-item p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white/50">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(rec.difficulty)}>{rec.difficulty}</Badge>
                      <Badge variant="outline" className="text-green-600 border-green-600">-{rec.potential_reduction}kg CO₂</Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={() => navigate('/map')} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
            <Map className="w-4 h-4" />
            View Community Map
          </Button>
          <Button onClick={() => navigate('/survey')} variant="outline" className="flex items-center gap-2 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300">
            Update Survey
          </Button>
          <Button onClick={() => navigate('/powerbi')} variant="outline" className="flex items-center gap-2 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300">
            Advanced Analytics
          </Button>
        </div>
      </div>

      <ChatBot currentPage="dashboard" />
    </div>
  );
}

