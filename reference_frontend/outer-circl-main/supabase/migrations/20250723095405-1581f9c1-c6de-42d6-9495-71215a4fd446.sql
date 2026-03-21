-- Recreate the missing trigger for sending email notifications
CREATE TRIGGER send_mailerlite_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_mailerlite_notification();