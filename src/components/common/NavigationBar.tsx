import React from 'react';
import { View } from 'react-native';
import { AppScreenHeader } from './AppScreenHeader';

type NavigationBarProps = {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    showClose?: boolean;
    onBackPress?: () => void;
    onClosePress?: () => void;
    rightActions?: React.ReactNode;
    transparent?: boolean;
    elevation?: 'none' | 'sm' | 'md' | 'lg';
};

export function NavigationBar({
    title,
    subtitle,
    showBack = false,
    showClose = false,
    onBackPress,
    onClosePress,
    rightActions,
    transparent = false,
    elevation = 'none',
}: NavigationBarProps) {
    return (
        <AppScreenHeader
            title={title || ''}
            subtitle={subtitle}
            showBack={showBack}
            showClose={showClose}
            onBackPress={onBackPress}
            onClosePress={onClosePress}
            rightSlot={rightActions ? <View>{rightActions}</View> : undefined}
            sticky={elevation !== 'none'}
            variant={transparent ? 'transparent' : 'glass'}
        />
    );
}
