import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
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

// ---------- Simple rule-based reduction tips ----------
const REDUCTION_TIPS: Record<string, string> = {
  Transport: "Combine trips, carpool, or use public transit 2–3 days/week.",
  Electricity: "Switch to LEDs, use smart power strips, set AC 1–2°C higher.",
  LPG: "Pressure cook when possible; ensure burners are clean and efficient.",
  Flights: "Prefer nonstop routes; consider rail for sub-800km trips.",
  Meat: "Swap 3 meat meals/week with plant-based options.",
  "Dining Out": "Reduce food delivery (packaging + delivery); cook larger batches.",
  Shopping: "Buy durable goods; avoid fast fashion; repair > replace.",
  Waste: "Segregate waste; compost wet waste; minimize disposables.",
  Diet: "Shift toward vegetarian/vegan days; focus on legumes & grains.",
  Heating: "Seal drafts; use efficient heaters; leverage sunlight mid-day.",
  Recycling: "Keep a 3-bin system; rinse recyclables; avoid mixed waste.",
  Cooking: "Induction where possible; lid-on cooking; match pot to flame.",
  Social: "Prefer nearby venues; rideshare to events; off-peak travel.",
};

// ---------- Types ----------
type Factors = Record<string, Record<string, number>>;
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
  numericTotal?: number;
  categoricalTotal?: number;
  timestamp: string;
}

type SubdomainRow = { subdomain: string; total_co2_median?: number; [k: string]: any };
type CityRow = { country: string; city: string; total_co2_median?: number; [k: string]: any };
type CountryRow = { country: string; total_co2_median?: number; [k: string]: any };

// ---------- CSV loader ----------
async function loadCSV<T = Record<string, any>>(path: string): Promise<T[]> {
  const res = await fetch(path);
  if (!res.ok) return [];
  const txt = await res.text();
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
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

export default function Dashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // ---------- State ----------
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [factors, setFactors] = useState<Factors>({});
  const [subStats, setSubStats] = useState<SubdomainRow[]>([]);
  const [cityStats, setCityStats] = useState<CityRow[]>([]);
  const [countryStats, setCountryStats] = useState<CountryRow[]>([]);

  // ---------- Effects ----------
  useEffect(() => {
    const raw = localStorage.getItem('carbonSurvey');
    if (!raw) {
      navigate('/survey');
      return;
    }
    const parsed = JSON.parse(raw) as SurveyData;
    setSurveyData(parsed);
    setRecommendations(MLRecommender.getPersonalizedRecommendations(parsed.categories));
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const [f, s, c1, c2] = await Promise.all([
          fetch('/data/emission_factors.json').then(r => r.json()),
          loadCSV<SubdomainRow>('/data/subdomain_stats.csv'),
          loadCSV<CityRow>('/data/city_stats.csv'),
          loadCSV<CountryRow>('/data/country_stats.csv'),
        ]);
        setFactors(f);
        setSubStats(s);
        setCityStats(c1);
        setCountryStats(c2);
      } catch (e) {
        console.error('data load error', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!surveyData) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".dashboard-header",{ opacity: 0, y: -30 },{ opacity: 1, y: 0, duration: 0.8 });
      gsap.fromTo(".dashboard-card",{ opacity: 0, y: 50, scale: 0.9 },{ opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.2, delay: 0.3 });
      gsap.fromTo(".recommendation-item",{ opacity: 0, x: -30 },{ opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 1 });
    }, containerRef);
    return () => ctx.revert();
  }, [surveyData]);

  // ---------- Derived values ----------
  const numericBreakdown = useMemo(() => {
    if (!surveyData) return [];
    return CarbonCalculator.getCategoryBreakdown(surveyData.categories);
  }, [surveyData]);

  const numericTotalOnly = useMemo(() => {
    if (!surveyData) return 0;
    return CarbonCalculator.calculateTotalCO2(surveyData.categories);
  }, [surveyData]);

  const catParts = useMemo(() => {
    if (!surveyData) return [];
    const cats = surveyData.categoricals || {};
    const valueFor = (key: keyof NonNullable<SurveyData['categoricals']>) => {
      const v = cats[key];
      const map = (factors as any)?.[key];
      if (v && map && typeof map[v] === 'number') return map[v] as number;
      return 0;
    };
    return [
      { label: 'Diet', value: valueFor('Diet') },
      { label: 'Heating', value: valueFor('Heating Energy Source') },
      { label: 'Recycling', value: valueFor('Recycling') },
      { label: 'Cooking', value: valueFor('Cooking_With') },
      { label: 'Social', value: valueFor('Social Activity') },
    ].filter(p => p.value > 0);
  }, [surveyData, factors]);

  const combinedForPie = useMemo(() => {
    const nb = numericBreakdown.map(item => ({
      label: CATEGORY_NAMES[item.category] ?? String(item.category),
      value: Number(item.co2 || 0),
    }));
    return [...nb, ...catParts];
  }, [numericBreakdown, catParts]);

  const youTotal = useMemo(() => {
    if (!surveyData) return 0;
    if (typeof surveyData.totalCO2 === 'number' && surveyData.totalCO2 > 0) return surveyData.totalCO2;
    const catSum = catParts.reduce((a, b) => a + b.value, 0);
    return numericTotalOnly + catSum;
  }, [surveyData, numericTotalOnly, catParts]);

  const topCombined = useMemo(() => {
    if (combinedForPie.length === 0) return { label: 'Total', pct: 0 };
    const total = combinedForPie.reduce((a, b) => a + b.value, 0) || 1;
    const top = [...combinedForPie].sort((a, b) => b.value - a.value)[0];
    return { label: top.label, pct: (top.value / total) * 100 };
  }, [combinedForPie]);

  const cityMedian = useMemo(() => {
    if (!surveyData) return 0;
    const c = surveyData.categoricals?.city;
    const country = surveyData.categoricals?.country;
    if (!c || !country) return 0;
    const row = cityStats.find(r => String(r.city) === String(c) && String(r.country) === String(country));
    return Number(row?.total_co2_median || 0);
  }, [cityStats, surveyData]);

  const countryMedian = useMemo(() => {
    if (!surveyData) return 0;
    const country = surveyData.categoricals?.country;
    if (!country) return 0;
    const row = countryStats.find(r => String(r.country) === String(country));
    return Number(row?.total_co2_median || 0);
  }, [countryStats, surveyData]);

  const top3 = useMemo(() => {
    const total = combinedForPie.reduce((a, b) => a + b.value, 0) || 1;
    return [...combinedForPie]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(p => ({
        label: p.label,
        value: p.value,
        pct: (p.value / total) * 100,
        tip: REDUCTION_TIPS[p.label] || "Focus on small, consistent habit changes.",
      }));
  }, [combinedForPie]);

  const pieData = useMemo(() => ({
    labels: combinedForPie.map(p => p.label),
    datasets: [{
      data: combinedForPie.map(p => p.value),
      backgroundColor: ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#84CC16','#F97316'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }), [combinedForPie]);

  const cityCountryBar = useMemo(() => ({
    labels: ['You', surveyData?.categoricals?.city ?? 'City', surveyData?.categoricals?.country ?? 'Country'],
    datasets: [{
      label: 'CO₂ Emissions (kg/month)',
      data: [youTotal, cityMedian, countryMedian],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      borderRadius: 8,
    }],
  }), [youTotal, cityMedian, countryMedian, surveyData]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ---------- Render ----------
  return (
    <div ref={containerRef} className="min-h-screen py-8 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <div className="dashboard-header text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Carbon Dashboard</h1>
          <p className="text-gray-600">
            {surveyData?.categoricals?.subdomain} · {surveyData?.categoricals?.city}, {surveyData?.categoricals?.country}
          </p>
          <p className="mt-1 text-lg"><b>Total:</b> {youTotal.toFixed(1)} kg / month</p>
        </div>

        {/* Top Contributor */}
        <Card className="dashboard-card mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Largest Contributor</h3>
                <p className="text-blue-100">
                  <span className="font-bold text-xl">{topCombined.label}</span>
                  {' '}accounts for <span className="font-bold">{topCombined.pct.toFixed(1)}%</span>
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="dashboard-card bg-white/90 shadow-xl border-0">
            <CardHeader><CardTitle>Your Emissions Breakdown</CardTitle></CardHeader>
            <CardContent><div className="h-80"><Pie data={pieData} /></div></CardContent>
          </Card>
          <Card className="dashboard-card bg-white/90 shadow-xl border-0">
            <CardHeader><CardTitle>Community Comparison</CardTitle></CardHeader>
            <CardContent><div className="h-80"><Bar data={cityCountryBar} /></div></CardContent>
          </Card>
        </div>

        {/* Top 3 + Tips */}
        <Card className="dashboard-card mb-8 bg-white/90 shadow-xl border-0">
          <CardHeader><CardTitle>Your Top 3 Categories & Tips</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {top3.map(item => (
                <div key={item.label} className="p-4 rounded-lg border bg-white/70 hover:shadow-md">
                  <div className="flex justify-between">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-sm text-gray-600">{item.pct.toFixed(1)}%</span>
                  </div>
                  <div className="text-sm text-gray-600">{item.value.toFixed(1)} kg/month</div>
                  <div className="text-xs text-gray-700"><b>Tip:</b> {item.tip}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="dashboard-card mb-8 bg-white/90 shadow-xl border-0">
          <CardHeader><CardTitle>AI-Powered Recommendations</CardTitle></CardHeader>
          <CardContent>
            {recommendations.map(rec => (
              <div key={rec.id} className="recommendation-item p-4 border rounded-lg mb-2 bg-white/50">
                <div className="flex justify-between">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <Badge className={getDifficultyColor(rec.difficulty)}>{rec.difficulty}</Badge>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={() => navigate('/map')} className="bg-gradient-to-r from-green-600 to-blue-600 text-white"> <Map className="w-4 h-4" /> View Map </Button>
          <Button onClick={() => navigate('/survey')} variant="outline">Update Survey</Button>
          <Button onClick={() => navigate('/powerbi')} variant="outline">Advanced Analytics</Button>
        </div>
      </div>
      <ChatBot currentPage="dashboard" />
    </div>
  );
}


