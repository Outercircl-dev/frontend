import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ActivityAgenda from './ActivityAgenda';
import { Card } from '@/components/ui/card';
interface BasicEventInfoProps {
  title: string;
  description: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}
const BasicEventInfo: React.FC<BasicEventInfoProps> = ({
  title,
  description,
  onInputChange
}) => {
  return <>
      <div className="grid gap-1.5">
        <Label htmlFor="title" className="text-xs sm:text-sm">Activity title *</Label>
        <Input id="title" name="title" value={title} onChange={onInputChange} placeholder="Give your activity a catchy title" className="h-9 sm:h-10 text-sm" />
      </div>
      
      
      
      <div className="grid gap-1.5">
        <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
        <Textarea id="description" name="description" value={description} onChange={onInputChange} placeholder="add more about your activity and agenda!" className="min-h-[100px] sm:min-h-[120px] text-sm resize-none" />
      </div>
    </>;
};
export default BasicEventInfo;