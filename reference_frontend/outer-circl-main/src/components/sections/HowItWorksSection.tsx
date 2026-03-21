
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { OptimizedImage } from '@/components/optimization/OptimizedImage';
import { HOMEPAGE_IMAGES, IMAGE_ALT_TEXTS } from '@/utils/imageMapping';

interface HowItWorksSectionProps {
  id?: string;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  id
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppContext();
  
  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate based on authentication status
    if (user) {
      console.log('HowItWorksSection: Authenticated user, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('HowItWorksSection: Unauthenticated user, navigating to auth');
      navigate('/auth');
    }
  };
  
  return <section id={id} className="py-12 sm:py-16 md:py-20 bg-[#FEF7CD]">
      <div className="container mx-auto px-5 sm:px-6 md:px-4">
        <div className="flex justify-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-bold text-center inline-block">
            <span className="relative z-10 text-[#E60023]">How It Works</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFD1DC] transform -rotate-1 z-0 highlight-animation" 
              style={{
                background: 'linear-gradient(90deg, #FFD1DC 0%, #FFEC99 100%)',
                borderRadius: '4px'
              }}></span>
          </h2>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left side - Image collage with Pinterest-style masonry grid */}
          <div className="relative w-full lg:w-1/2 h-[500px]">
            <div className="absolute top-[5%] left-[15%] w-[220px] h-[220px] rounded-3xl overflow-hidden shadow-lg transform rotate-[-8deg] z-10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-[-6deg]">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.HOW_IT_WORKS.FOOD_EXPERIENCE} 
                alt={IMAGE_ALT_TEXTS.HOW_IT_WORKS.FOOD_EXPERIENCE}
                className="w-full h-full object-cover" 
                priority
              />
            </div>
            <div className="absolute top-[25%] right-[15%] w-[180px] h-[180px] rounded-3xl overflow-hidden shadow-lg transform rotate-[5deg] z-20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-[7deg]">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.HOW_IT_WORKS.HIKING_ACTIVITY} 
                alt={IMAGE_ALT_TEXTS.HOW_IT_WORKS.HIKING_ACTIVITY}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute bottom-[10%] left-[20%] w-[200px] h-[200px] rounded-3xl overflow-hidden shadow-lg transform rotate-[8deg] z-30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-[10deg]">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.HOW_IT_WORKS.FRIENDS_MEETING} 
                alt={IMAGE_ALT_TEXTS.HOW_IT_WORKS.FRIENDS_MEETING}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute top-[50%] left-[45%] w-[160px] h-[160px] rounded-3xl overflow-hidden shadow-lg transform rotate-[-5deg] z-15 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:rotate-[-3deg]">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.HOW_IT_WORKS.GROUP_ACTIVITY} 
                alt={IMAGE_ALT_TEXTS.HOW_IT_WORKS.GROUP_ACTIVITY}
                className="w-full h-full object-cover" 
              />
            </div>
          </div>

          {/* Right side - Text content */}
          <div className="w-full lg:w-1/2 space-y-5 sm:space-y-6 md:space-y-7">
            <div className="mb-1 sm:mb-2">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
                Search for an activity
              </h2>
            </div>
            <p className="text-lg sm:text-xl text-slate-700 max-w-lg leading-relaxed">
              What do you want to try next? Think of something you're into—like "outdoor yoga" or "board games"—and see what you find.
            </p>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">Can't find something you like? Start an activity yourself and have others join you!</p>
            <Button 
              type="button"
              className="bg-[#e60023] hover:bg-[#d50c22] text-white font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={handleExploreClick}
            >
              Explore activities
            </Button>
          </div>
        </div>
      </div>
    </section>;
};

export default HowItWorksSection;
