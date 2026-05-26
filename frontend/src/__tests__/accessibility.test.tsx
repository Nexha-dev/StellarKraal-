import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import HealthGauge from '../components/HealthGauge';

// Mock the design tokens to avoid import issues
jest.mock('@/lib/design-tokens', () => ({
  colors: {
    text: {
      secondary: 'text-brown-600'
    }
  },
  healthColor: (value: number) => {
    if (value >= 15000) return '#16A34A';
    if (value >= 10000) return '#D97706';
    return '#DC2626';
  }
}));

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  test('HealthGauge should not have accessibility violations', async () => {
    const { container } = render(<HealthGauge value={15000} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('HealthGauge with low health should not have accessibility violations', async () => {
    const { container } = render(<HealthGauge value={8000} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('HealthGauge should have proper color contrast', async () => {
    const { container } = render(<HealthGauge value={15000} />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    expect(results).toHaveNoViolations();
  });
});
