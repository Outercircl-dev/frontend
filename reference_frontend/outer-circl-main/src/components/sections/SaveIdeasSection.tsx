
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { OptimizedImage } from '@/components/optimization/OptimizedImage';
import { HOMEPAGE_IMAGES, IMAGE_ALT_TEXTS } from '@/utils/imageMapping';

const SaveIdeasSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppContext();

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate based on authentication status
    if (user) {
      console.log('SaveIdeasSection: Authenticated user, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('SaveIdeasSection: Unauthenticated user, navigating to auth');
      navigate('/auth');
    }
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-[#D0F0C0] save-ideas-glow">
      <div className="container mx-auto px-5 sm:px-6 md:px-8">
        <div className="flex flex-col-reverse lg:flex-row gap-8 sm:gap-10 lg:gap-24 items-center justify-between">
          {/* Left side - Text content */}
          <div className="w-full lg:w-1/3 space-y-5 sm:space-y-6 md:space-y-8 pl-0 sm:pl-4 lg:pl-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A5F55] leading-tight">
              Save ideas you like
            </h2>
            <p className="text-lg sm:text-xl text-slate-700 relative z-10 leading-relaxed">
              Commit to activities you like. Activities are confirmed once 3+ people join.
            </p>
            
            <div className="pt-4">
              <Button 
                type="button"
                className="bg-[#e60023] hover:bg-[#d50c22] text-white font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={handleExploreClick}
              >
                Explore activities
              </Button>
            </div>
          </div>

          {/* Right side - Pinterest style collage */}
          <div className="w-full lg:w-3/5 relative h-[450px]">
            {/* Main large image */}
            <div className="absolute top-0 left-0 w-[55%] h-[90%] rounded-3xl overflow-hidden shadow-lg pinterest-card-hover">
              <div className="w-full h-full relative bg-[#333] rounded-3xl overflow-hidden">
                <OptimizedImage 
                  src={HOMEPAGE_IMAGES.SAVE_IDEAS.OUTDOOR_ACTIVITIES} 
                  alt={IMAGE_ALT_TEXTS.SAVE_IDEAS.OUTDOOR_ACTIVITIES}
                  className="w-full h-full object-cover opacity-90"
                  priority
                />
                <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                  <h3 className="text-3xl font-bold mb-2">Outdoor activities</h3>
                  <p className="text-xl">Find your next adventure</p>
                </div>
              </div>
            </div>

            {/* Top right image */}
            <div className="absolute top-0 right-0 w-[32%] h-[40%] rounded-3xl overflow-hidden shadow-lg pinterest-card-hover">
              <div className="w-full h-full relative bg-[#333] rounded-3xl overflow-hidden">
                <OptimizedImage 
                  src={HOMEPAGE_IMAGES.SAVE_IDEAS.COOKING_CLASSES} 
                  alt={IMAGE_ALT_TEXTS.SAVE_IDEAS.COOKING_CLASSES}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                  <h3 className="text-lg font-bold">Cooking classes</h3>
                </div>
              </div>
            </div>

            {/* Middle right image */}
            <div className="absolute top-[50%] right-0 w-[32%] h-[20%] rounded-3xl overflow-hidden shadow-lg transform translate-y-[-50%] pinterest-card-hover">
              <div className="w-full h-full relative bg-[#333] rounded-3xl overflow-hidden">
                <OptimizedImage 
                  src={HOMEPAGE_IMAGES.SAVE_IDEAS.GARDENING_MEETUP} 
                  alt={IMAGE_ALT_TEXTS.SAVE_IDEAS.GARDENING_MEETUP}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                  <h3 className="text-lg font-bold">Gardening meetup</h3>
                </div>
              </div>
            </div>

            {/* Bottom right image */}
            <div className="absolute bottom-0 right-0 w-[32%] h-[40%] rounded-3xl overflow-hidden shadow-lg pinterest-card-hover">
              <div className="w-full h-full relative bg-[#333] rounded-3xl overflow-hidden">
                <OptimizedImage 
                  src={HOMEPAGE_IMAGES.SAVE_IDEAS.SOCIAL_GAMING} 
                  alt={IMAGE_ALT_TEXTS.SAVE_IDEAS.SOCIAL_GAMING}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                  <h3 className="text-lg font-bold">Social gaming nights</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SaveIdeasSection;
