type SemanticTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface SemanticColorSet {
    bg: string;
    softBg: string;
    text: string;
    border: string;
    icon: string;
}

export function getSemanticColors(colors: any, tone: SemanticTone): SemanticColorSet {
    switch (tone) {
        case 'success':
            return {
                bg: colors.successBg,
                softBg: colors.successSurface ?? colors.successBg,
                text: colors.success,
                border: `${colors.success}26`,
                icon: colors.success,
            };
        case 'warning':
            return {
                bg: colors.warningBg,
                softBg: colors.warningSurface ?? colors.warningBg,
                text: colors.warning,
                border: `${colors.warning}26`,
                icon: colors.warning,
            };
        case 'danger':
            return {
                bg: colors.dangerBg,
                softBg: colors.dangerSurface ?? colors.dangerBg,
                text: colors.danger,
                border: `${colors.danger}26`,
                icon: colors.danger,
            };
        case 'info':
            return {
                bg: colors.infoBg,
                softBg: colors.infoSurface ?? colors.infoBg,
                text: colors.info,
                border: `${colors.info}26`,
                icon: colors.info,
            };
        case 'neutral':
            return {
                bg: colors.surfaceMuted,
                softBg: colors.surfaceAlt,
                text: colors.textSecondary,
                border: colors.border,
                icon: colors.textSecondary,
            };
        case 'primary':
        default:
            return {
                bg: colors.primaryBg,
                softBg: colors.interactiveActive ?? colors.primaryBg,
                text: colors.primary,
                border: `${colors.primary}26`,
                icon: colors.primary,
            };
    }
}
