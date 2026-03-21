
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@/components/ui/carousel';

interface HeroSectionProps {
  onHowItWorksClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = React.memo(({
  onHowItWorksClick
}) => {
  const activities = [
    "Ocean Dip",
    "3k Jog",
    "Tues Toddler Meetup",
    "Beach Cleanup"
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const navigate = useNavigate();
  
  // Sync currentIndex with carousel position
  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentIndex(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on('select', onSelect);
    onSelect(); // Set initial index
    
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);
  
  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    if (!carouselApi) return;
    
    const autoplayInterval = setInterval(() => {
      carouselApi.scrollNext();
    }, 3000);
    
    return () => {
      clearInterval(autoplayInterval);
    };
  }, [carouselApi]);
  
  const handleDotClick = useCallback((index: number) => {
    carouselApi?.scrollTo(index);
  }, [carouselApi]);

  const handleExploreClick = () => {
    navigate('/auth');
  };

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 md:py-20">
      <div className="container px-4">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-3 sm:mb-4 text-foreground leading-tight">
            your next activity
          </h1>
          
          {/* Increased height to prevent text cutting off */}
          <div className="min-h-[60px] sm:min-h-[80px] md:min-h-[100px] w-full flex items-center justify-center overflow-visible">
            <Carousel 
              className="w-full"
              setApi={setCarouselApi}
              opts={{
                align: "center",
                loop: true,
                skipSnaps: false,
              }}
            >
              <CarouselContent>
                {activities.map((activity, index) => (
                  <CarouselItem key={index} className="flex justify-center">
                    <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-1 sm:mb-2 text-primary transition-opacity duration-300 px-2 leading-tight">
                      {activity}
                    </h2>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
          
          {/* Tiny indicator dots */}
          <div className="flex justify-center items-center mb-6 sm:mb-8 mt-3 sm:mt-4" style={{ gap: '6px' }}>
            {activities.map((_, i) => (
              <button 
                key={i} 
                className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 flex-shrink-0 border-none p-0 m-0 ${
                  i === currentIndex ? 'bg-primary' : 'bg-muted-foreground'
                }`}
                style={{ 
                  all: 'unset',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                aria-label={`Activity ${i + 1}: ${activities[i]}`}
                onClick={() => handleDotClick(i)}
                onMouseEnter={(e) => {
                  if (i !== currentIndex) {
                    e.currentTarget.className = e.currentTarget.className.replace('bg-muted-foreground', 'bg-muted');
                  }
                }}
                onMouseLeave={(e) => {
                  if (i !== currentIndex) {
                    e.currentTarget.className = e.currentTarget.className.replace('bg-muted', 'bg-muted-foreground');
                  }
                }}
              />
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto px-4 sm:px-0">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-6 sm:px-8 w-full sm:w-auto"
              onClick={handleExploreClick}
            >
              Join us today
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={onHowItWorksClick} 
              className="border-border hover:bg-muted shadow-lg transition-all duration-300 rounded-full px-6 sm:px-8 w-full sm:w-auto"
            >
              How it works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
