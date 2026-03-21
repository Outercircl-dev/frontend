
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { MailPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  firstName: z.string().min(1, { message: "First name is required." }),
  interests: z.array(z.string()).optional(),
  frequency: z.enum(["daily", "weekly", "monthly"], {
    required_error: "Please select a newsletter frequency.",
  }),
  promotions: z.boolean().default(false),
});

// Updated interests options to match the dashboard categories
const interestOptions = [
  { id: "social", label: "Social" },
  { id: "education", label: "Education" },
  { id: "sports", label: "Sports & Fitness" },
  { id: "arts", label: "Arts & Culture" },
  { id: "technology", label: "Technology" },
  { id: "food", label: "Food & Drinks" },
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "outdoors", label: "Outdoors" },
  { id: "gaming", label: "Gaming" },
  { id: "giving-back", label: "Giving Back" },
  { id: "other", label: "Other" }
];

const NewsletterSignup: React.FC = () => {
  const navigate = useNavigate();
  const { membershipTier } = useMembership();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      firstName: "",
      interests: [],
      frequency: "weekly", // Default to weekly
      promotions: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting newsletter subscription:', values);
      
      const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
        body: {
          email: values.email,
          firstName: values.firstName,
          interests: values.interests,
          frequency: values.frequency,
          promotions: values.promotions
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast.error('Failed to subscribe to newsletter. Please try again.');
        return;
      }

      if (data.error) {
        console.error('Newsletter subscription error:', data.error);
        toast.error(data.error);
        return;
      }

      console.log('Newsletter subscription successful:', data);
      
      // Store subscription status in localStorage for local tracking
      localStorage.setItem("newsletterSubscribed", "true");
      localStorage.setItem("subscribedEmail", values.email);
      localStorage.setItem("newsletterFrequency", values.frequency);
      
      toast.success("Welcome to the outercircl buzz newsletter!");
      
      // Navigate to dashboard after successful subscription
      navigate("/dashboard");
      
    } catch (error) {
      console.error('Unexpected error during newsletter subscription:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar isLoggedIn={true} />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 inline-flex items-center">
              the outercircl
              <span className="text-[0.5rem] ml-0.5">™</span> 
              buzz
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join our newsletter to get weekly updates on the best activities, recommendations, 
              and community highlights delivered straight to your inbox.
            </p>
          </div>
          
          {/* Form Card */}
          <Card className="w-full shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-[#E60023] text-white">
              <div className="flex items-center gap-2">
                <MailPlus className="h-6 w-6" />
                <CardTitle>subscribe to the buzz</CardTitle>
              </div>
              <CardDescription className="text-white/90">
                get updates on activities near you
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>first name</FormLabel>
                          <FormControl>
                            <Input placeholder="enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>email</FormLabel>
                          <FormControl>
                            <Input placeholder="enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Newsletter Frequency Section */}
                  <div>
                    <h3 className="text-base font-medium mb-3">how often would you like to receive updates?</h3>
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-wrap gap-4"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="daily" id="daily" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer" htmlFor="daily">
                                  daily
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="weekly" id="weekly" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer" htmlFor="weekly">
                                  weekly
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="monthly" id="monthly" />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer" htmlFor="monthly">
                                  monthly
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-medium mb-3">what are you interested in?</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {interestOptions.map((interest) => (
                        <FormField
                          key={interest.id}
                          control={form.control}
                          name="interests"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(interest.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedInterests = checked
                                      ? [...(field.value || []), interest.id]
                                      : field.value?.filter((value) => value !== interest.id) || [];
                                    field.onChange(updatedInterests);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {interest.label.toLowerCase()}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="promotions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            send me occasional promotional emails
                          </FormLabel>
                          <FormDescription>
                            we'll never share your email with third parties.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <CardFooter className="flex justify-between px-0 pb-0">
                    <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                      cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-[#E60023] hover:bg-[#D50C22]"
                    >
                      {isSubmitting ? "subscribing..." : "subscribe"}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Benefits Section */}
          <div className="mt-16 space-y-8">
            <h2 className="text-2xl font-bold text-center mb-8">why subscribe?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-[#E60023] bg-opacity-10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#E60023]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">what's new updates</h3>
                <p className="text-gray-600">get curated activities in your area delivered every week or everyday!</p>
              </div>
              
              <div className="text-center">
                <div className="bg-[#E60023] bg-opacity-10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#E60023]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">exclusive content</h3>
                <p className="text-gray-600">access tips, guides, and member stories not available elsewhere.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-[#E60023] bg-opacity-10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#E60023]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">community features</h3>
                <p className="text-gray-600">hear from other members and get inspired by community stories.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewsletterSignup;
