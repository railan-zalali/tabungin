import React from 'react';
import { ViewStyle } from 'react-native';
import { EmptyState } from './EmptyState';

interface EmptyIllustrationStateProps {
    icon: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    compact?: boolean;
}

export function EmptyIllustrationState(props: EmptyIllustrationStateProps) {
    return <EmptyState {...props} illustrationVariant="ring" />;
}
