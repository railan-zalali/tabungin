function normalizeHex(hexColor: string): string | null {
    const value = hexColor.trim().replace('#', '');
    if (value.length === 3) {
        return value.split('').map((char) => `${char}${char}`).join('');
    }
    if (value.length === 6) {
        return value;
    }
    return null;
}

export function getRelativeLuminance(hexColor: string): number {
    const normalized = normalizeHex(hexColor);
    if (!normalized) {
        return 0;
    }

    const channels = normalized.match(/.{1,2}/g)?.map((segment) => parseInt(segment, 16) / 255) ?? [0, 0, 0];
    const linearized = channels.map((channel) =>
        channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
    );

    return (0.2126 * linearized[0]) + (0.7152 * linearized[1]) + (0.0722 * linearized[2]);
}

export function getReadableTextColor(
    hexColor: string,
    options?: { light?: string; dark?: string; threshold?: number },
): string {
    const light = options?.light ?? '#FFFFFF';
    const dark = options?.dark ?? '#13201B';
    const threshold = options?.threshold ?? 0.5;

    return getRelativeLuminance(hexColor) > threshold ? dark : light;
}
