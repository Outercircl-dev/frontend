
import React from 'react';
import ActivityCard, { EventData } from '@/components/ActivityCard';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FeaturedActivitiesSectionProps {
  featuredEvents: EventData[];
}

const FeaturedActivitiesSection: React.FC<FeaturedActivitiesSectionProps> = ({
  featuredEvents
}) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setIsLoggedIn(!!session);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setIsLoggedIn(!!session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <section className="pt-6 pb-12">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Featured Activities</h2>
          <Link to="/dashboard">
            <Button variant="ghost" className="text-[#E60023] hover:text-[#D50C22] flex items-center gap-1 text-sm">
              See all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {featuredEvents.map((event) => (
              <CarouselItem key={event.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <div className="h-full animate-fade-in">
                  <ActivityCard event={event} className="h-full text-sm" isHomepageSample={true} isLoggedIn={isLoggedIn} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-6 gap-2">
            <CarouselPrevious className="relative static border-none bg-transparent hover:bg-gray-100 h-10 w-10 rounded-full shadow-none" />
            <CarouselNext className="relative static border-none bg-transparent hover:bg-gray-100 h-10 w-10 rounded-full shadow-none" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default FeaturedActivitiesSection;
