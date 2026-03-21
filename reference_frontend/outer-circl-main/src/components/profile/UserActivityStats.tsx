import React from 'react';
import { BarChart3, TrendingUp, Calendar, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserActivityStats } from '@/hooks/useUserActivityStats';

interface UserActivityStatsProps {
  userId: string;
  className?: string;
}

const UserActivityStats: React.FC<UserActivityStatsProps> = ({ userId, className = '' }) => {
  const { activityStats, activitySummary, loading, error } = useUserActivityStats(userId);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const totalActivities = activitySummary?.total_activities || 0;
  const categoriesCount = activitySummary?.categories_participated || 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-lg">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <h4 className="text-lg font-semibold text-gray-900 font-sans">Activity Statistics</h4>
      </div>

      {totalActivities === 0 ? (
        <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No activities completed yet</p>
          <p className="text-xs text-gray-400 mt-1">Start joining events to build your activity history!</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-700">{totalActivities}</p>
                <p className="text-xs text-blue-600 font-medium">Total Activities</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">{categoriesCount}</p>
                <p className="text-xs text-green-600 font-medium">Categories</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {activityStats.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Activity Breakdown</h5>
              <div className="space-y-2">
                {activityStats.map((stat) => (
                  <div 
                    key={stat.category}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {stat.category.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {stat.category.replace('-', ' ')}
                        </p>
                        {stat.last_activity_date && (
                          <p className="text-xs text-gray-500">
                            Last: {new Date(stat.last_activity_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{stat.activity_count}</p>
                      <p className="text-xs text-gray-500">activities</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserActivityStats;