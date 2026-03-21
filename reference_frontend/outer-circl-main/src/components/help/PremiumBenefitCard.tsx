
import React from 'react';
import { Card } from '@/components/ui/card';

interface PremiumBenefitCardProps {
  title: string;
  description: string;
}

const PremiumBenefitCard = ({ title, description }: PremiumBenefitCardProps) => {
  return (
    <Card className="border border-[#E60023]/20 bg-gradient-to-br from-[#E60023]/5 to-[#E60023]/10 rounded-2xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <h4 className="font-semibold mb-2 text-gray-800">{title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </Card>
  );
};

export default PremiumBenefitCard;
