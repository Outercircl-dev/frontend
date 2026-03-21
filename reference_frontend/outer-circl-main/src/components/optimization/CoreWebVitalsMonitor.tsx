import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
  unit: string;
  description: string;
}

interface CoreWebVitalsState {
  lcp: WebVital | null; // Largest Contentful Paint
  fid: WebVital | null; // First Input Delay
  cls: WebVital | null; // Cumulative Layout Shift
  fcp: WebVital | null; // First Contentful Paint
  ttfb: WebVital | null; // Time to First Byte
}

const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // ms
  fid: { good: 100, poor: 300 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // score
  fcp: { good: 1800, poor: 3000 }, // ms
  ttfb: { good: 800, poor: 1800 }, // ms
};

const DESCRIPTIONS = {
  lcp: 'Time until the largest content element is rendered',
  fid: 'Time between first user interaction and browser response',
  cls: 'Measure of visual stability during page load',
  fcp: 'Time until the first content is painted on screen',
  ttfb: 'Time until the first byte is received from the server',
};

export const CoreWebVitalsMonitor: React.FC = () => {
  const [vitals, setVitals] = useState<CoreWebVitalsState>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  });

  const [overallScore, setOverallScore] = useState<number>(0);

  const getRating = (value: number, threshold: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const createVital = (name: string, value: number, unit: string = 'ms'): WebVital => ({
    name,
    value,
    rating: getRating(value, THRESHOLDS[name as keyof typeof THRESHOLDS]),
    threshold: THRESHOLDS[name as keyof typeof THRESHOLDS],
    unit,
    description: DESCRIPTIONS[name as keyof typeof DESCRIPTIONS],
  });

  useEffect(() => {
    // Only monitor in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('Core Web Vitals monitoring disabled in development');
      return;
    }

    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        setVitals(prev => ({
          ...prev,
          lcp: createVital('lcp', lastEntry.startTime),
        }));
      }
    });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        setVitals(prev => ({
          ...prev,
          fid: createVital('fid', fid),
        }));
      });
    });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });
      
      setVitals(prev => ({
        ...prev,
        cls: createVital('cls', clsValue, ''),
      }));
    });

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          setVitals(prev => ({
            ...prev,
            fcp: createVital('fcp', entry.startTime),
          }));
        }
      });
    });

    // Time to First Byte
    const measureTTFB = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.fetchStart;
        setVitals(prev => ({
          ...prev,
          ttfb: createVital('ttfb', ttfb),
        }));
      }
    };

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      fcpObserver.observe({ entryTypes: ['paint'] });
      
      // Measure TTFB immediately if navigation is complete
      if (document.readyState === 'complete') {
        measureTTFB();
      } else {
        window.addEventListener('load', measureTTFB);
      }
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
      window.removeEventListener('load', measureTTFB);
    };
  }, []);

  // Calculate overall score
  useEffect(() => {
    const vitalValues = Object.values(vitals).filter(Boolean) as WebVital[];
    if (vitalValues.length === 0) return;

    const scores = vitalValues.map(vital => {
      switch (vital.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    setOverallScore(avgScore);
  }, [vitals]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'needs-improvement': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'poor': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Only render in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const vitalsList = Object.values(vitals).filter(Boolean) as WebVital[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Core Web Vitals
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Overall Score: <span className={`font-semibold ${getScoreColor(overallScore)}`}>
                {Math.round(overallScore)}
              </span>
            </div>
            <Progress value={overallScore} className="flex-1 max-w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {vitalsList.length === 0 ? (
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                Measuring Core Web Vitals... Please interact with the page.
              </AlertDescription>
            </Alert>
          ) : (
            vitalsList.map((vital) => (
              <div key={vital.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getRatingIcon(vital.rating)}
                  <div>
                    <div className="font-medium">{vital.name.toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground">{vital.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg">
                    {vital.unit === '' ? vital.value.toFixed(3) : Math.round(vital.value)}
                    <span className="text-sm text-muted-foreground ml-1">{vital.unit}</span>
                  </div>
                  <Badge variant="secondary" className={getRatingColor(vital.rating)}>
                    {vital.rating.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {vitalsList.some(vital => vital.rating === 'poor') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some Core Web Vitals need improvement. Consider optimizing images, reducing JavaScript bundles, 
            or minimizing layout shifts to enhance user experience.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};