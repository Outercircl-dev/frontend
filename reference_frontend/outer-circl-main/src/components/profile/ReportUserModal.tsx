import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { toast } from "sonner";

interface ReportUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  userId: string;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Fake profile",
  "Harassment",
  "Spam",
  "Other"
];

const ReportUserModal: React.FC<ReportUserModalProps> = ({
  open,
  onOpenChange,
  username,
  userId
}) => {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!details.trim()) {
      toast.error("Please provide details for your report.");
      return;
    }
    
    // Show contact information for reporting
    toast.success("Please email your report to info@outercircl.com with the details you provided.");
    onOpenChange(false);
    
    // Reset form
    setReason(REPORT_REASONS[0]);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report User: {username}</DialogTitle>
          <DialogDescription>
            Please provide information about why you're reporting this user.
            You'll be directed to email info@outercircl.com with your report.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleReportSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for reporting</Label>
              <RadioGroup 
                value={reason} 
                onValueChange={setReason}
                className="flex flex-col space-y-2"
              >
                {REPORT_REASONS.map((reportReason) => (
                  <div key={reportReason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reportReason} id={`reason-${reportReason}`} />
                    <Label htmlFor={`reason-${reportReason}`}>{reportReason}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="details">Additional details</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide any additional information..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-[#E60023] hover:bg-[#D50C22]"
            >
              <Mail className="mr-2 h-4 w-4" />
              Get Email Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserModal;
