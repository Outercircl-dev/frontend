# Hugging Face API Setup for Homepage Image Generation

## Required Steps:

1. **Get Hugging Face API Token**:
   - Visit https://huggingface.co/settings/tokens
   - Create a new token with read permissions
   - Copy the token

2. **Add to Supabase Secrets**:
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions → Secrets
   - Add new secret: `HUGGING_FACE_ACCESS_TOKEN` = your token

3. **Access Admin Panel**:
   - Navigate to `/admin/homepage-images` in your app
   - Click "Generate All Homepage Images"
   - Wait for AI to create Pinterest-style images

4. **How it Works**:
   - Images are generated using Flux.1-schnell model
   - Saved to database for persistence
   - Homepage automatically uses generated images
   - Falls back to original images if none generated

## Admin Access:
Only users with 'admin' role can generate images. Make sure your user account has admin privileges in the database.