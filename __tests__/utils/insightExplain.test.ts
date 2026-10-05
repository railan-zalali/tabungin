// Kelengkapan penjelasan insight (IN-1).
//
// `Record<InsightId, InsightExplanation>` sudah menjamin kecukupan secara
// tipe — bila InsightEngine menambah id baru tanpa penjelasan, typecheck
// gagal. Test ini memastikan isinya tidak ada yang kosong/karangan kosong.
import { INSIGHT_EXPLANATIONS } from '../../src/utils/insightExplain';

const INSIGHT_IDS = [
    'unusual-spend',
    'savings-rate',
    'spending-trend',
    'category-shift',
    'forecast',
    'top-category',
] as const;

describe('INSIGHT_EXPLANATIONS', () => {
    it('mencakup setiap id insight', () => {
        for (const id of INSIGHT_IDS) {
            expect(INSIGHT_EXPLANATIONS[id]).toBeDefined();
        }
        expect(Object.keys(INSIGHT_EXPLANATIONS).sort()).toEqual([...INSIGHT_IDS].sort());
    });

    it('setiap penjelasan punya arti dan langkah yang berisi', () => {
        for (const id of INSIGHT_IDS) {
            const explanation = INSIGHT_EXPLANATIONS[id];
            expect(explanation.meaning.trim().length).toBeGreaterThan(40);
            expect(explanation.action.trim().length).toBeGreaterThan(40);
        }
    });

    it('arti dan aksi selalu berbeda (bukan teks sama-sama)', () => {
        for (const id of INSIGHT_IDS) {
            const { meaning, action } = INSIGHT_EXPLANATIONS[id];
            expect(action).not.toBe(meaning);
        }
    });
});
