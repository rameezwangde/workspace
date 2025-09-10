import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatBot } from '../components/ChatBot';

// --- Types ---
type CityRow = {
  country: string;
  city: string;
  total_co2_median?: number;
  total_co2_count?: number;
};

// What we’ll show when a marker is clicked
type SelectedCity = {
  city: string;
  median: number;
  count: number;
};

// --- Faux map positions (percentages within the map box) ---
// Add/adjust positions as needed
const CITY_POS: Record<string, { leftPct: number; topPct: number }> = {
  'Mumbai':        { leftPct: 28, topPct: 40 },
  'Navi Mumbai':   { leftPct: 42, topPct: 55 },
  'Delhi':         { leftPct: 45, topPct: 20 },
  'Bengaluru':     { leftPct: 35, topPct: 75 },
  'Chennai':       { leftPct: 55, topPct: 78 },
  'Kolkata':       { leftPct: 72, topPct: 32 },
  'Hyderabad':     { leftPct: 45, topPct: 62 },
  'Pune':          { leftPct: 30, topPct: 52 },
  'Jaipur':        { leftPct: 38, topPct: 27 },
  'Ahmedabad':     { leftPct: 30, topPct: 35 },
};

// --- CSV loader (tiny, no extra deps) ---
async function loadCityStats(): Promise<CityRow[]> {
  const res = await fetch('/data/city_stats.csv');
  if (!res.ok) return [];
  const txt = await res.text();
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const rec: any = {};
    headers.forEach((h, i) => {
      const raw = (cols[i] ?? '').trim();
      const num = Number(raw);
      rec[h] = Number.isFinite(num) && raw !== '' ? num : raw;
    });
    return rec as CityRow;
  });
  return rows;
}

// --- Marker visuals based on median CO2 ---
const emissionColor = (median: number) =>
  median < 200 ? 'bg-green-500' : median < 400 ? 'bg-yellow-500' : 'bg-red-500';

const emissionSize = (median: number) =>
  median < 200 ? 'w-4 h-4' : median < 400 ? 'w-6 h-6' : 'w-8 h-8';

export default function Map() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const [cityStats, setCityStats] = useState<CityRow[]>([]);
  const [selected, setSelected] = useState<SelectedCity | null>(null);

  // Your saved survey (to highlight user's city)
  const survey = useMemo(() => {
    const raw = localStorage.getItem('carbonSurvey');
    return raw ? JSON.parse(raw) : null;
  }, []);

  // Animations (unchanged)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".map-header", { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });
      gsap.fromTo(".map-container", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.8, delay: 0.3, ease: "back.out(1.7)" });
      gsap.fromTo(".community-card", { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: "power2.out" });
      gsap.fromTo(".map-marker", { scale: 0, rotation: 180 }, { scale: 1, rotation: 0, duration: 0.5, stagger: 0.05, delay: 1, ease: "back.out(1.7)" });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Load city aggregate stats from CSV
  useEffect(() => {
    (async () => {
      const rows = await loadCityStats();
      // we’ll keep only India (your dataset constraint)
      setCityStats(rows.filter(r => String(r.country) === 'India'));
    })();
  }, []);

  // Build marker data (only for cities we have positions for)
  const markers = useMemo(() => {
    return cityStats
      .filter(r => CITY_POS[r.city as keyof typeof CITY_POS])
      .map(r => {
        const pos = CITY_POS[r.city as keyof typeof CITY_POS];
        const median = Number(r.total_co2_median || 0);
        const count = Number(r.total_co2_count || 0);
        return { city: r.city, median, count, left: pos.leftPct, top: pos.topPct };
      });
  }, [cityStats]);

  // Community summary (right-hand card)
  const community = useMemo(() => {
    if (!cityStats.length) return { totalCities: 0, avgMedian: 0, userCityCount: 0, nearCityCount: 0 };
    const totalCities = cityStats.length;
    const avgMedian = cityStats.reduce((a, r) => a + Number(r.total_co2_median || 0), 0) / totalCities;

    const userCity = survey?.categoricals?.city;
    const nearCity = 'Navi Mumbai'; // for display parity with your OG UI; change as you like

    const userCityCount = cityStats.find(r => r.city === userCity)?.total_co2_count || 0;
    const nearCityCountVal = cityStats.find(r => r.city === nearCity)?.total_co2_count || 0;

    return {
      totalCities,
      avgMedian,
      userCityCount: Number(userCityCount),
      nearCityCount: Number(nearCityCountVal),
    };
  }, [cityStats, survey]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen py-8 relative overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%),
          url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.02'%3E%3Cpath d='M60 60L0 0v60h60zM60 60L120 0v60H60zM60 60L0 120v-60h60zM60 60L120 120v-60H60z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `
      }}
    >
      {/* animated blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-green-200/10 to-blue-200/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-blue-200/10 to-green-200/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <div className="map-header mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Carbon Map</h1>
          <p className="text-gray-600 leading-relaxed">
            Explore carbon emissions across Indian cities (based on your dataset)
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Faux Map */}
          <div className="lg:col-span-2">
            <Card className="map-container bg-white/90 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  India — City Median CO₂ Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={mapRef}
                  className="relative bg-gradient-to-br from-blue-100/80 to-green-100/80 rounded-lg h-96 overflow-hidden shadow-inner"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5f3ff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {/* Labels for a couple of cities (optional) */}
                  <div className="absolute top-6 left-1/4 bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                    West Cluster
                  </div>
                  <div className="absolute top-6 right-1/4 bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                    East Cluster
                  </div>

                  {/* Your city marker (highlight) */}
                  {survey?.categoricals?.city && CITY_POS[survey.categoricals.city] && (
                    <div
                      className="map-marker absolute transform -translate-x-1/2 -translate-y-1/2 ring-4 ring-blue-300/60 rounded-full border-2 border-white shadow-xl"
                      style={{
                        left: `${CITY_POS[survey.categoricals.city].leftPct}%`,
                        top: `${CITY_POS[survey.categoricals.city].topPct}%`,
                        width: '14px',
                        height: '14px',
                        backgroundColor: '#2563eb'
                      }}
                      title={`You: ${survey.categoricals.city}`}
                    />
                  )}

                  {/* Community markers: size & color by median */}
                  {markers.map((m) => (
                    <div
                      key={m.city}
                      className={`map-marker absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${emissionColor(m.median)} ${emissionSize(m.median)} rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform hover:shadow-xl`}
                      style={{ left: `${m.left}%`, top: `${m.top}%` }}
                      onClick={() => setSelected({ city: m.city, median: m.median, count: m.count })}
                      title={`${m.city} — median ${m.median.toFixed(1)} kg/month (${m.count} users)`}
                    />
                  ))}

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
                    <h4 className="font-semibold text-sm mb-2">Emission Levels (median)</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Low (&lt;200 kg/month)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span>Medium (200–400 kg)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-red-500 rounded-full"></div>
                        <span>High (&gt;400 kg)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: stats + selection */}
          <div className="space-y-6">
            <Card className="community-card bg-white/90 backdrop-blur-sm shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Community Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cities in dataset</span>
                    <Badge variant="outline">{cityStats.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average city median</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {cityStats.length ? (
                        (cityStats.reduce((s, r) => s + Number(r.total_co2_median || 0), 0) / cityStats.length).toFixed(1)
                      ) : '—'} kg
                    </Badge>
                  </div>
                  {survey?.categoricals?.city && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{survey.categoricals.city} users</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {Number(cityStats.find(r => r.city === survey.categoricals.city)?.total_co2_count || 0)}
                      </Badge>
                    </div>
                  )}
                  {survey?.categoricals?.city === 'Mumbai' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Navi Mumbai users</span>
                      <Badge className="bg-green-100 text-green-800">
                        {Number(cityStats.find(r => r.city === 'Navi Mumbai')?.total_co2_count || 0)}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selected && (
              <Card className="community-card border-blue-200 bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    City Details — {selected.city}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Median Emissions</span>
                      <span className="font-semibold">{selected.median.toFixed(1)} kg/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Users Count</span>
                      <span className="font-semibold">{selected.count}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Data source: <code>city_stats.csv</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="community-card text-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Back to Your Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ChatBot currentPage="map" />
    </div>
  );
}
