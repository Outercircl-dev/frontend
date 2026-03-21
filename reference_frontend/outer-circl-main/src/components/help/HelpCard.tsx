
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface HelpCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}

const HelpCard = ({ icon: Icon, title, description, items }: HelpCardProps) => {
  return (
    <Card className="border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded-full bg-[#E60023]/10 mr-3">
            <Icon className="h-5 w-5 text-[#E60023]" />
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E60023] mt-2 mr-3 flex-shrink-0"></div>
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default HelpCard;
