import React from 'react';
import { ContextBadge } from './ContextBadge';
import { InsightPanel } from './InsightPanel';
import type { Insight, InsightTone } from '../../utils/insightEngine';

/** Penanda visual agar nada insight terbaca sekilas tanpa membaca deskripsi. */
const TONE_META: Record<InsightTone, { icon: string; label: string }> = {
    success: { icon: 'check-circle-outline', label: 'Positif' },
    warning: { icon: 'alert-circle-outline', label: 'Perhatian' },
    info: { icon: 'information-outline', label: 'Info' },
    neutral: { icon: 'chart-box-outline', label: 'Ringkasan' },
};

interface InsightCardProps {
    insight: Insight;
    actionLabel?: string;
    onAction?: () => void;
}

/** Kartu insight keluaran InsightEngine, siap ditempel ke layar mana pun. */
export function InsightCard({ insight, actionLabel, onAction }: InsightCardProps) {
    const tone = TONE_META[insight.tone];

    return (
        <InsightPanel
            icon={insight.icon}
            title={insight.title}
            description={insight.description}
            badges={<ContextBadge icon={tone.icon} label={tone.label} tone={insight.tone} />}
            actionLabel={actionLabel}
            onAction={onAction}
        />
    );
}
