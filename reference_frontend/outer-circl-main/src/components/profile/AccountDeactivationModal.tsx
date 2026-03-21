import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface AccountDeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const AccountDeactivationModal = ({ isOpen, onClose, userId }: AccountDeactivationModalProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDeactivation = async () => {
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          account_status: "deactivated",
          deactivated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Account Permanently Deactivated",
        description: "Your account has been permanently deactivated and cannot be recovered.",
      });

      // Sign out the user
      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      console.error("Error deactivating account:", error);
      toast({
        title: "Error", 
        description: "Failed to deactivate account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Deactivate Account
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              <strong>⚠️ WARNING: This action is PERMANENT and cannot be undone.</strong>
            </p>
            <p>
              Are you sure you want to permanently deactivate your account? This action will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Permanently delete access to your account</li>
              <li>Hide your profile from other users forever</li>
              <li>Remove you from all activities permanently</li>
              <li>Prevent you from ever logging in again</li>
              <li>Make all your data inaccessible</li>
            </ul>
            <p className="text-sm font-bold text-destructive">
              This action is IRREVERSIBLE. Your account cannot be recovered once deactivated.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirm-deactivation"
            checked={isConfirmed}
            onCheckedChange={(checked) => setIsConfirmed(checked === true)}
          />
          <label
            htmlFor="confirm-deactivation"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I understand this action is PERMANENT and cannot be undone
          </label>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivation}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? "Permanently Deactivating..." : "Permanently Deactivate Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};