import React from 'react';
import { Share2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useHapticFeedback } from '@/utils/hapticFeedback';

interface ShareData {
  title: string;
  text?: string;
  url: string;
}

interface NativeSharingProps {
  shareData: ShareData;
  fallbackText?: string;
  className?: string;
}

const NativeSharing: React.FC<NativeSharingProps> = ({ 
  shareData, 
  fallbackText = "Share",
  className = ""
}) => {
  const { toast } = useToast();
  const { triggerHaptic } = useHapticFeedback();

  const canShare = navigator.share && navigator.canShare?.(shareData);

  const handleNativeShare = async () => {
    if (!canShare) return;

    try {
      triggerHaptic('medium');
      await navigator.share(shareData);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        handleFallbackShare();
      }
    }
  };

  const handleFallbackShare = async () => {
    try {
      triggerHaptic('light');
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Copy failed:', error);
      // Open in new tab as last resort
      window.open(shareData.url, '_blank');
    }
  };

  const handleShare = () => {
    if (canShare) {
      handleNativeShare();
    } else {
      handleFallbackShare();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={className}
    >
      {canShare ? (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          {fallbackText}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </>
      )}
    </Button>
  );
};

export default NativeSharing;