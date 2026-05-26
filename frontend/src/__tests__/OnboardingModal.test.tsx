import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from '../components/OnboardingModal';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorageMock.setItem.mockClear();
  });

  it('renders when open', () => {
    render(<OnboardingModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<OnboardingModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Connect Your Wallet')).not.toBeInTheDocument();
  });

  it('advances through steps', () => {
    render(<OnboardingModal isOpen={true} onClose={() => {}} />);
    
    // First step
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    
    // Click next
    fireEvent.click(screen.getByText('Next'));
    
    // Second step
    expect(screen.getByText('Register Collateral')).toBeInTheDocument();
    
    // Click next
    fireEvent.click(screen.getByText('Next'));
    
    // Third step
    expect(screen.getByText('Request a Loan')).toBeInTheDocument();
  });

  it('completes onboarding and sets localStorage', () => {
    const onClose = jest.fn();
    render(<OnboardingModal isOpen={true} onClose={onClose} />);
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    
    // Complete onboarding
    fireEvent.click(screen.getByText('Get Started'));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('stellarkraal_onboarding_completed', 'true');
    expect(onClose).toHaveBeenCalled();
  });

  it('allows skipping and sets localStorage', () => {
    const onClose = jest.fn();
    render(<OnboardingModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Skip'));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('stellarkraal_onboarding_completed', 'true');
    expect(onClose).toHaveBeenCalled();
  });
});
