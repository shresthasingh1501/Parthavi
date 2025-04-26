import React from 'react';
import TopicCard from '../TopicCard';
import { useUser } from '../../context/UserContext';
import { Briefcase, GraduationCap, MessageSquare, Users, Search } from 'lucide-react';

const DiscoverPanel = () => {
    const { userName } = useUser();
    const currentHour = new Date().getHours();
    let greeting = "Hello";
    if (currentHour < 12) {
        greeting = "Good morning";
    } else if (currentHour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

  return (
    <div className="p-4 space-y-5 h-full overflow-y-auto">
        <h2 className="text-xl font-semibold font-serif text-secondary">
             {greeting}, {userName || 'there'}!
        </h2>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm space-y-3">
            <div className='flex items-center gap-3'>
                <div className="bg-purple-100 p-2 rounded-full">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-secondary text-base">Start a new conversation</h3>
            </div>
             <p className="text-sm text-gray-600">Explore career paths, get interview tips, or discuss work challenges.</p>
            <button className="text-sm font-medium text-primary hover:underline px-1">
                Ask Parthavi anything
            </button>
        </div>

        <h3 className="font-semibold text-secondary text-base pt-2">Popular Topics</h3>
        <div className="grid grid-cols-2 gap-3">
             <TopicCard
                imageUrl="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400"
                title="Job Search Strategies"
                size="custom"
                className="h-36"
                tagIcon={<Search size={14} className="text-blue-600"/>}
                tagText="Find Roles"
                tagColor="bg-blue-100"
             />
             <TopicCard
                imageUrl="https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400"
                title="Interview Preparation"
                size="custom"
                className="h-36"
                 tagIcon={<MessageSquare size={14} className="text-green-600"/>}
                 tagText="Ace Interviews"
                 tagColor="bg-green-100"
             />
        </div>

         <TopicCard
            imageUrl="https://images.pexels.com/photos/1181317/pexels-photo-1181317.jpeg?auto=compress&cs=tinysrgb&w=600"
            title="Skill Development"
            size="custom"
            className="h-32"
            tagIcon={<GraduationCap size={14} className="text-emerald-600"/>}
            tagText="Learn & Grow"
            tagColor="bg-emerald-100"
         />

          <TopicCard
            imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=600"
            title="Networking & Mentorship"
            size="custom"
            className="h-40"
             tagIcon={<Users size={14} className="text-primary"/>}
             tagText="Connect"
             tagColor="bg-accent/80"
         />

    </div>
  );
};

export default DiscoverPanel;
