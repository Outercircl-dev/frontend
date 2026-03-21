
import React, { useState } from 'react';
import { Clock, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AgendaItem {
  id: string;
  time: string;
  description: string;
}

const ActivityAgenda: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [newItemTime, setNewItemTime] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: '1', time: '00:00', description: '5 minute intros are best, before activity!' },
  ]);

  const addAgendaItem = () => {
    if (newItemTime && newItemDesc) {
      const newItem: AgendaItem = {
        id: Date.now().toString(),
        time: newItemTime,
        description: newItemDesc,
      };
      setAgendaItems([...agendaItems, newItem]);
      setNewItemTime('');
      setNewItemDesc('');
    }
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems(agendaItems.filter(item => item.id !== id));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 mb-2 cursor-pointer p-2 rounded-md hover:bg-pink-100 transition-colors">
          <Clock className="h-4 w-4 text-pink-600" />
          <h3 className="font-medium text-sm text-pink-600">
            Activity Agenda (optional) {!open && `(${agendaItems.length} items)`}
          </h3>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3">
        <div className="grid gap-2 mb-3">
          {agendaItems.map((item) => (
            <div 
              key={item.id} 
              className="group flex items-start gap-2 p-3 bg-white rounded-lg border border-pink-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="min-w-[60px] text-xs font-medium text-pink-600">
                {item.time}
              </div>
              <p className="text-sm flex-1">{item.description}</p>
              <button 
                onClick={() => removeAgendaItem(item.id)} 
                className="opacity-0 group-hover:opacity-100 text-pink-300 hover:text-pink-500 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        
        <div className="border-t border-pink-100 pt-3 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="time" className="text-xs">Time</Label>
              <Input 
                id="time" 
                type="time" 
                value={newItemTime} 
                onChange={(e) => setNewItemTime(e.target.value)} 
                className="h-8 text-xs" 
                placeholder="00:00"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <div className="flex gap-2">
                <Input 
                  id="description" 
                  value={newItemDesc} 
                  onChange={(e) => setNewItemDesc(e.target.value)} 
                  className="h-8 text-xs flex-1" 
                  placeholder="What happens at this time?"
                />
                <Button 
                  onClick={addAgendaItem} 
                  type="button" 
                  size="sm" 
                  className="h-8 bg-pink-600 hover:bg-pink-700 text-white" 
                  disabled={!newItemTime || !newItemDesc}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Adding a detailed agenda helps participants know what to expect
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ActivityAgenda;
