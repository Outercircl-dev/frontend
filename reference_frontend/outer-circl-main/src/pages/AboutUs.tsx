import React from 'react';
import Navbar from '@/components/Navbar';
import UnifiedSEO from '@/components/UnifiedSEO';
import { Footer } from '@/components/sections';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { HandHeart, Heart, Users, Instagram } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card } from '@/components/ui/card';
const AboutUs: React.FC = () => {
  return (
    <>
      <UnifiedSEO
        title="About Us - Connect and Try Something New Together"
        description="Learn about outercircl's mission to help people find activity buddies and connect with their local community. Whether it's a morning walk, ocean dip, or playground playdate - try something new, together!"
        keywords="about outercircl, our story, community building, activity friends, local connections, social activities"
        canonicalUrl="https://outercircl.com/about-us"
      />
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar isLoggedIn={false} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#E60023] to-[#BD081C] opacity-10"></div>
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-[#E60023]">We're outercircl.</h1>
                  <p className="text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Whether it's a morning walk, ocean dip, or a toddler playground playdate - try something new, together!
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link to="/auth?tab=register">
                    <Button className="bg-[#E60023] hover:bg-[#BD081C]">Join Our Community</Button>
                  </Link>
                </div>
              </div>
              <div className="mx-auto grid grid-cols-3 gap-2 md:gap-4">
                <div className="grid gap-2 md:gap-4">
                  <div className="rounded-lg overflow-hidden h-40 md:h-60 shadow-md transform translate-y-4">
                    <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070" alt="Community event" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="grid gap-2 md:gap-4">
                  <div className="rounded-lg overflow-hidden h-40 md:h-60 shadow-md">
                    <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2532" alt="Friends gathering" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-lg overflow-hidden h-40 shadow-md">
                    <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070" alt="Group activity" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="grid gap-2 md:gap-4">
                  <div className="rounded-lg overflow-hidden h-40 shadow-md">
                    <img src="https://images.unsplash.com/photo-1472396961693-142e6e269027" alt="Outdoor event" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-lg overflow-hidden h-40 md:h-60 shadow-md">
                    <img src="https://images.unsplash.com/photo-1542628682-88321d2a4828?q=80&w=2070" alt="Community workshop" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-12 md:py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 items-center">
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Our Story

                </h2>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <Card className="overflow-hidden border-none shadow-lg rounded-xl">
                  <AspectRatio ratio={4 / 3}>
                    <img src="https://images.unsplash.com/photo-1501854140801-50d01698950b" alt="Moms smiling on a walk" className="object-cover w-full h-full rounded-t-xl hover:scale-105 transition-transform duration-500" />
                  </AspectRatio>
                </Card>
                <div className="bg-gray-50 p-6 rounded-xl space-y-4 md:p-10">
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Feeling stuck in the same routine? Dreaming of moving to Bali to "find yourself"? Wishing you had someone to try that thing you've always wanted to do? Yeah—us too.
                  </p>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    That's why we built outercircl, to bring real sparks into everyday life. It's a space to redefine community and connection—through shared daily experiences that turn into the stories worth talking about.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Added extra space with a divider section */}
        <div className="py-6 md:py-10 bg-white"></div>

        {/* Take Care of Yourself, Help Others Section */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">At <span className="text-[#E60023]">outercircl</span>, we do it together</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <HandHeart className="h-8 w-8 text-[#E60023] flex-shrink-0 mt-1" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold">Community Impact</h3>
                      <p className="text-gray-600">
                        At outercircl, we're committed to giving back—10% of our profits go directly to mental health charities in Ireland. When you join us for the fun, you support others too; we're in this together.
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="flex items-start gap-4">
                    <Heart className="h-8 w-8 text-[#E60023] flex-shrink-0 mt-1" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold">Happiness, Guaranteed</h3>
                      <p className="text-gray-600">
                        We believe everyone has something meaningful to share. Be yourself, show up, and share your time and your activities with others. Trust us, it's a win, win.
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="flex items-start gap-4">
                    <Users className="h-8 w-8 text-[#E60023] flex-shrink-0 mt-1" />
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold">Your Voice Matters</h3>
                      <p className="text-gray-600">
                        If there's any way we can improve your experience—or if your community has an idea we can help bring to life—just reach out. We're here for it.
                      </p>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-[#E60023]" />
                        <a href="https://www.instagram.com/outercircl/" target="_blank" rel="noopener noreferrer" className="text-[#E60023] hover:underline font-medium">Follow us on Instagram</a>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pinterest-card rounded-xl overflow-hidden shadow-lg">
                  <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2532" alt="Community gathering" className="w-full h-[400px] object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Join Us Section */}
        <section className="relative py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#E60023] to-[#BD081C] opacity-10"></div>
          <div className="container px-4 md:px-6 relative z-10 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to Find Your outercircl?</h2>
              <p className="text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Join thousands of people discovering new activities and find someone to do it with.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center pt-4">
                <Link to="/auth?tab=register">
                  <Button size="lg" className="bg-[#E60023] hover:bg-[#BD081C]">Create Your Account</Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline">Browse Activities</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
        <Footer />
      </div>
    </>
  );
};
export default AboutUs;