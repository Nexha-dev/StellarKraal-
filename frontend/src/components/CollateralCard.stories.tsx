import type { Meta, StoryObj } from '@storybook/react';
import CollateralCard from './CollateralCard';

const meta: Meta<typeof CollateralCard> = {
  title: 'Components/CollateralCard',
  component: CollateralCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    walletAddress: 'GA...',
    onRegisterCollateral: () => alert('Register clicked'),
  },
};

export const WithRegisterButton: Story = {
  args: {
    ...Default.args,
  },
};