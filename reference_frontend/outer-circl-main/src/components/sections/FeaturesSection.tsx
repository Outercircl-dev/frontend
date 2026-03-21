
import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/components/OptimizedProviders';
import { OptimizedImage } from '@/components/optimization/OptimizedImage';
import { HOMEPAGE_IMAGES, IMAGE_ALT_TEXTS } from '@/utils/imageMapping';

const FeaturesSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppContext();

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate based on authentication status
    if (user) {
      console.log('FeaturesSection: Authenticated user, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('FeaturesSection: Unauthenticated user, navigating to auth');
      navigate('/auth');
    }
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-[#FFF8C5] save-ideas-glow">
      <div className="container mx-auto px-5 sm:px-6 md:px-4">
        <div className="flex flex-col lg:flex-row gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left side - Image collage with chat overlay */}
          <div className="relative w-full lg:w-1/2 h-[500px]">
            {/* Image collage */}
            <div className="absolute top-[5%] left-[10%] w-[240px] h-[240px] rounded-3xl overflow-hidden shadow-lg transform rotate-[-5deg] z-10 pinterest-card-hover">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.FEATURES.FRIENDS_LAUGHING} 
                alt={IMAGE_ALT_TEXTS.FEATURES.FRIENDS_LAUGHING}
                className="w-full h-full object-cover" 
                priority
              />
            </div>
            <div className="absolute bottom-[15%] left-[20%] w-[200px] h-[200px] rounded-3xl overflow-hidden shadow-lg transform rotate-[8deg] z-30 pinterest-card-hover">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.FEATURES.GROUP_HIKING} 
                alt={IMAGE_ALT_TEXTS.FEATURES.GROUP_HIKING}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute top-[25%] right-[10%] w-[180px] h-[180px] rounded-3xl overflow-hidden shadow-lg transform rotate-[5deg] z-20 pinterest-card-hover">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.FEATURES.FRIENDS_CAFE} 
                alt={IMAGE_ALT_TEXTS.FEATURES.FRIENDS_CAFE}
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute top-[45%] left-[25%] w-[160px] h-[160px] rounded-3xl overflow-hidden shadow-lg transform rotate-[-3deg] z-15 pinterest-card-hover">
              <OptimizedImage 
                src={HOMEPAGE_IMAGES.FEATURES.GROUP_GAMES} 
                alt={IMAGE_ALT_TEXTS.FEATURES.GROUP_GAMES}
                className="w-full h-full object-cover" 
              />
            </div>
            
            {/* Chat interface overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 w-[80%] max-w-[300px] bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
              {/* Chat header */}
              <div className="bg-white px-3 py-2 border-b flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-[#e60023]" />
                <span className="font-medium text-sm">Activity Chat</span>
              </div>
              
              {/* Chat messages */}
              <div className="px-3 py-2 bg-gray-50 h-[120px] overflow-y-auto">
                <div className="flex items-start mb-2">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
                    <AvatarFallback className="bg-[#e60023]/10 text-[#e60023] text-xs">SJ</AvatarFallback>
                  </Avatar>
                  <div className="bg-white rounded-lg px-2 py-1 text-xs max-w-[80%]">
                    <p>Hey! Are we still on for the hike tomorrow?</p>
                  </div>
                </div>
                <div className="flex items-start justify-end mb-2">
                  <div className="bg-[#e60023] rounded-lg px-2 py-1 text-xs text-white max-w-[80%]">
                    <p>Absolutely! I'll bring snacks 😊</p>
                  </div>
                </div>
              </div>
              
              {/* Chat input */}
              <div className="p-2 bg-white flex items-center">
                <Input 
                  type="text" 
                  placeholder="Message..." 
                  className="text-xs h-8 border-none shadow-none focus-visible:ring-0"
                />
                <Button size="icon" className="h-6 w-6 rounded-full ml-1 bg-[#e60023] hover:bg-[#d50c22] p-1">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Yellow background shape */}
            <div className="absolute top-[20%] left-[35%] w-[280px] h-[280px] bg-[#FFBA08] rounded-3xl transform rotate-[10deg] z-5"></div>
          </div>

          {/* Right side - Text content */}
          <div className="w-full lg:w-1/2 space-y-5 sm:space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
              Connect with activity friends
            </h2>
            <p className="text-lg sm:text-xl text-slate-700 max-w-lg leading-relaxed">
              Chat with your activity buddies once activities are confirmed. Meet up and have a great time!
            </p>
            
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
    </section>
  );
};

export default FeaturesSection;
