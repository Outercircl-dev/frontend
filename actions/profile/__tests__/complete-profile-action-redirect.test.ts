/**
 * Unit test for OD-178: Verify redirect goes to /profile (not /feed)
 * @see actions/profile/complete-profile-action.ts
 * @ticket OD-178
 * 
 * Critical test: Ensures redirect destination is /profile after onboarding
 */

describe('OD-178: Redirect to profile page', () => {
  it('should redirect to /profile (not /feed) after successful profile save', () => {
    // Read the actual source code to verify redirect path
    const fs = require('fs')
    const path = require('path')
    const actionPath = path.join(__dirname, '../complete-profile-action.ts')
    const actionCode = fs.readFileSync(actionPath, 'utf-8')
    
    // Verify redirect is to /profile
    expect(actionCode).toContain("redirect('/profile')")
    expect(actionCode).not.toContain("redirect('/feed')")
    
    // Verify revalidatePath is for /profile
    expect(actionCode).toContain("revalidatePath('/profile')")
    expect(actionCode).not.toContain("revalidatePath('/feed')")
  })
})

