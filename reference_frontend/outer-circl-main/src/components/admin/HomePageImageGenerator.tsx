import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useHomePageImageGeneration } from '@/hooks/useHomePageImageGeneration';

const HomePageImageGenerator: React.FC = () => {
  const { images, isGenerating, generateAllImages, generateSingleImage } = useHomePageImageGeneration();

  const renderImageSection = (
    title: string,
    category: 'howItWorks' | 'saveIdeas',
    sectionImages: any
  ) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>
          AI-generated images for the {title.toLowerCase()} section
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(sectionImages).map(([key, image]: [string, any]) => (
            <div key={key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateSingleImage(category, key)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {image ? (
                <div className="space-y-2">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={`Generated ${key} image`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Generated
                  </Badge>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {image.prompt}
                  </p>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">No image generated</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Homepage Image Generator</h1>
        <p className="text-muted-foreground mb-4">
          Generate AI-powered images for your homepage sections using Pinterest-style aesthetics.
        </p>
        
        <Button
          onClick={generateAllImages}
          disabled={isGenerating}
          size="lg"
          className="mb-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating Images...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate All Homepage Images
            </>
          )}
        </Button>

        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              🎨 AI is creating beautiful images for your homepage. This process may take several minutes as each image is generated individually.
            </p>
          </div>
        )}
      </div>

      {renderImageSection('How It Works', 'howItWorks', images.howItWorks)}
      {renderImageSection('Save Ideas', 'saveIdeas', images.saveIdeas)}
    </div>
  );
};

export default HomePageImageGenerator;