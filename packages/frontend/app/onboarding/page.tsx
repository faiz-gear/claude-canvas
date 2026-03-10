/**
 * Onboarding Page
 *
 * First-time setup wizard for Claude Canvas
 */

import { OnboardingWizard } from '@/components/onboarding'

export default function OnboardingPage() {
  return <OnboardingWizard />
}

export const metadata = {
  title: 'Setup - Claude Canvas',
  description: 'Get started with Claude Canvas'
}
