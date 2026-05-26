import type { Meta, StoryObj } from '@storybook/react';
import LoanForm from './LoanForm';

const meta: Meta<typeof LoanForm> = {
  title: 'Components/LoanForm',
  component: LoanForm,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    walletAddress: 'GA...',
  },
};

export const CollateralStep: Story = {
  args: {
    ...Default.args,
  },
};

export const LoanStep: Story = {
  args: {
    ...Default.args,
  },
};