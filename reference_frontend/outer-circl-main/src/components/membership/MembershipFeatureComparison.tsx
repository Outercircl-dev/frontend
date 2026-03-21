
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Crown, Sparkles } from 'lucide-react';

const MembershipFeatureComparison: React.FC = () => {
  const features = [
    {
      category: 'core features',
      icon: Sparkles,
      items: [
        { name: 'browse unlimited activities', standard: true, premium: true },
        { name: 'join public activities', standard: true, premium: true },
        { name: 'create activities (max 4 participants)', standard: true, premium: false },
        { name: 'community access', standard: true, premium: true }
      ]
    },
    {
      category: 'premium features',
      icon: Crown,
      items: [
        { name: 'create unlimited activities per month', standard: false, premium: true },
        { name: 'unlimited participants per activity', standard: false, premium: true },
        { name: 'activity approval controls', standard: false, premium: true },
        { name: 'advanced profile features', standard: false, premium: true },
        { name: 'early access to new features', standard: false, premium: true }
      ]
    }
  ];

  const plans = [
    { key: 'standard', title: 'standard', color: 'text-gray-600' },
    { key: 'premium', title: 'premium', color: 'text-[#E60023]' }
  ];

  return (
    <div className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">compare features</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          see what's included with each plan to find the perfect fit for your lifestyle
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {features.map((category) => {
          const IconComponent = category.icon;
          return (
            <Card key={category.category} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <IconComponent className="h-5 w-5 text-[#E60023]" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-medium text-gray-700 min-w-[250px]">feature</th>
                        {plans.map((plan) => (
                          <th key={plan.key} className={`text-center p-4 font-semibold ${plan.color} min-w-[120px]`}>
                            {plan.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, index) => (
                        <tr key={index} className={`border-b hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}>
                          <td className="p-4 text-gray-700">{item.name}</td>
                           {plans.map((plan) => (
                            <td key={plan.key} className="p-4 text-center">
                              {item[plan.key as keyof typeof item] ? (
                                <Check className="h-5 w-5 text-green-500 mx-auto" />
                              ) : plan.key === 'premium' ? (
                                <span className="text-sm font-medium text-[#E60023]">No Limits</span>
                              ) : (
                                <X className="h-5 w-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MembershipFeatureComparison;
