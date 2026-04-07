import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/useAuthStore';

function isHapticEnabled() {
    return useAuthStore.getState().hapticEnabled;
}

export async function triggerHapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): Promise<void> {
    if (!isHapticEnabled()) return;

    try {
        await Haptics.impactAsync(style);
    } catch (error) {
        console.warn('[Haptics] impact failed', error);
    }
}

export async function triggerHapticNotification(
    type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
): Promise<void> {
    if (!isHapticEnabled()) return;

    try {
        await Haptics.notificationAsync(type);
    } catch (error) {
        console.warn('[Haptics] notification failed', error);
    }
}
