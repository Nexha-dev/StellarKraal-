import type { Meta, StoryObj } from '@storybook/react';
import RepayPanel from './RepayPanel';

const meta: Meta<typeof RepayPanel> = {
  title: 'Components/RepayPanel',
  component: RepayPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    walletAddress: 'GA...',
  },
};

export const WithInitialValues: Story = {
  args: {
    walletAddress: 'GA...',
    initialLoanId: '123',
    initialAmount: '100',
  },
};