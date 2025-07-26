// src/components/Button.stories.tsx

import type { Story, StoryDefault } from '@ladle/react'
import { Button } from '../ui/button.js'
import { TrashIcon, CheckIcon, PlusIcon, DownloadIcon, Pencil1Icon } from '@radix-ui/react-icons' // Importing Radix UI Icons

export default {
  title: 'Components / Button'
} satisfies StoryDefault

export const Default: Story = () => <Button>Default Button</Button>

export const Destructive: Story = () => <Button variant="destructive">Destructive Button</Button>

export const Outline: Story = () => <Button variant="outline">Outline Button</Button>

export const Secondary: Story = () => <Button variant="secondary">Secondary Button</Button>

export const Ghost: Story = () => <Button variant="ghost">Ghost Button</Button>

export const Link: Story = () => <Button variant="link">Link Button</Button>

export const Small: Story = () => <Button size="sm">Small Button</Button>

export const Large: Story = () => <Button size="lg">Large Button</Button>

export const IconButton: Story = () => (
  <Button variant="ghost" size="icon" aria-label="Delete">
    <TrashIcon />
  </Button>
)

export const Disabled: Story = () => <Button disabled>Disabled Button</Button>

export const WithIcon: Story = () => (
  <Button>
    <CheckIcon />
    Confirm
  </Button>
)

export const CombinedVariants: Story = () => (
  <div className="flex flex-col gap-4">
    <Button variant="default" size="default">
      Default
    </Button>
    <Button variant="destructive" size="sm">
      Destructive Small
    </Button>
    <Button variant="outline" size="lg">
      Outline Large
    </Button>
    <Button variant="secondary" size="icon" aria-label="Add">
      <PlusIcon />
    </Button>
    <Button variant="ghost" size="default" disabled>
      Ghost Disabled
    </Button>
    <Button variant="link">Link Variant</Button>
  </div>
)

export const WithDifferentIcons: Story = () => (
  <div className="flex flex-col gap-4">
    <Button variant="default">
      <DownloadIcon />
      Download
    </Button>
    <Button variant="secondary">
      <Pencil1Icon />
      Edit
    </Button>
    <Button variant="destructive" size="icon" aria-label="Remove">
      <PlusIcon />
    </Button>
  </div>
)
