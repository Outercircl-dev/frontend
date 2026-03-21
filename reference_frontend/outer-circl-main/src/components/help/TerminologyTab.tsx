
import React from 'react';
import HelpCard from './HelpCard';
import { Star, Users, Calendar, MessageCircle, Info, Heart } from 'lucide-react';

const TerminologyTab = () => {
  const terminologyData = [
    {
      icon: Heart,
      title: "Core Activity",
      description: "OuterCircl's main activities with a maximum of 4 attendees, designed to make the most of your time together!",
      items: [
        "Limited to 4 participants for low-key connections",
        "Small meetups for your every day spark",
        "Perfect for building lasting friendships",
        "Higher engagement and participation rates"
      ]
    },
    {
      icon: Star,
      title: "Reliability Rating",
      description: "A score from 1.0 to 5.0 that reflects how dependable a user is when participating in activities.",
      items: [
        "Based on attendance, punctuality, and ratings",
        "Higher ratings indicate more reliable members",
        "Premium members can view everyone's reliability rating",
        "New users start with no rating until they participate"
      ]
    },
    {
      icon: Users,
      title: "Activity Buddies",
      description: "People you connect with to join activities together. Similar to \"friends\" on other platforms.",
      items: [
        "Add buddies by sending them friend requests",
        "Buddies receive notifications about your activities",
        "Message your buddies directly",
        "See activities your buddies are attending"
      ]
    },
    {
      icon: Calendar,
      title: "Activities",
      description: "Gatherings created by users that others can join. They can be anything from hikes to coffee meetups.",
      items: [
        "Details include location, time, and max participants",
        "Join others' activities or create your own",
        "Rate participants after attending"
      ]
    },
    {
      icon: MessageCircle,
      title: "The Buzz",
      description: "Our newsletter that keeps you updated on new features, popular activities, and community highlights.",
      items: [
        "Receive regular updates via email",
        "Tips for finding and creating activities",
        "Community stories and success highlights",
        "Early access to new features"
      ]
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border p-8 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#E60023]/10 mb-4">
          <Info className="h-6 w-6 text-[#E60023]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Key Terminology</h2>
        <p className="text-gray-600">Understanding OuterCircl's unique features and concepts</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {terminologyData.map((item, index) => (
          <HelpCard
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
            items={item.items}
          />
        ))}
      </div>
    </div>
  );
};

export default TerminologyTab;
