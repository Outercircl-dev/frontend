import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Zap } from 'lucide-react';

interface AdFallbackCardProps {
  variant?: 'premium' | 'feature' | 'community';
  className?: string;
}

const AdFallbackCard: React.FC<AdFallbackCardProps> = ({
  variant = 'premium',
  className = ""
}) => {
  const getVariantContent = () => {
    switch (variant) {
      case 'premium':
        return {
          icon: <Crown className="w-5 h-5" />,
          badge: 'Premium',
          title: 'Upgrade to Premium',
          description: 'Join thousands discovering amazing activities with no ads',
          cta: 'Start Free Trial',
          gradient: 'from-primary/10 to-primary/5',
          badgeColor: 'bg-primary/10 text-primary border-primary/30'
        };
      
      case 'feature':
        return {
          icon: <Sparkles className="w-5 h-5" />,
          badge: 'New Feature',
          title: 'Discover AI Suggestions',
          description: 'Get personalized activity recommendations powered by AI',
          cta: 'Try It Now',
          gradient: 'from-accent/10 to-accent/5',
          badgeColor: 'bg-accent/10 text-accent-foreground border-accent/30'
        };
      
      case 'community':
        return {
          icon: <Zap className="w-5 h-5" />,
          badge: 'Community',
          title: 'Share Your Activities',
          description: 'Inspire others by sharing your favorite local discoveries',
          cta: 'Join Community',
          gradient: 'from-secondary/10 to-secondary/5',
          badgeColor: 'bg-secondary/10 text-secondary-foreground border-secondary/30'
        };
      
      default:
        return getVariantContent();
    }
  };

  const content = getVariantContent();

  return (
    <Card className={`pinterest-card-hover mobile-card bg-gradient-to-br ${content.gradient} border-primary/10 ${className}`}>
      <div className="p-6 text-center">
        {/* Badge with icon */}
        <div className="mb-4">
          <Badge variant="outline" className={`${content.badgeColor} gap-1`}>
            {content.icon}
            {content.badge}
          </Badge>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-2 text-lg">
          {content.title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {content.description}
        </p>
        
        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm"
          className="w-full bg-background/50 hover:bg-background/80 transition-all duration-300"
        >
          {content.cta}
        </Button>
        
        {/* Pinterest-style bottom accent */}
        <div className="mt-4 h-1 w-12 mx-auto rounded-full bg-primary/30" />
      </div>
    </Card>
  );
};

export default AdFallbackCard;