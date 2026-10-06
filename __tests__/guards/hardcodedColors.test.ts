// Guard anti-hardcoded-color (roadmap §4.3 P3-01, task AR-5).
//
// Audit menemukan `color: '#FFFFFF'` di AddDebtScreen setelah semua layer UI
// lain bersih, dan tidak ada apa pun yang mencegahnya kembali. Test ini
// memindai seluruh layer UI dan gagal begitu ada hex atau rgba/hsla literal
// di sana.
//
// Token warna hanya boleh datang dari `useThemeStore().colors`; file di dalam
// `src/store` dan `src/constants` tidak dipindai karena di situ token justru
// didefinisikan.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = join(__dirname, '..', '..');
const SCAN_DIRS = ['src/components', 'src/screens'];
const EXTENSIONS = ['.ts', '.tsx'];

// Pengecualian harus spesifik per baris, bukan per file: kalau filetya
// di-skip utuh, hex baru di dalamnya tidak akan pernah ketahuan.
const ALLOWED_RULES: Array<{ file: string; pattern: RegExp; reason: string }> = [
    {
        file: 'src/screens/report/ReportScreen.tsx',
        pattern: /^const REPORT_[A-Z_]+ = '#[0-9A-Fa-f]{6}';$/,
        reason: 'warna HTML laporan dirender expo-print di luar React Native, jadi harus tetap konstanta bernama',
    },
];

// Hex 3/4/6/8 digit (mis. #fff, #FFFFFF) dan fungsi warna literal.
const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FN_PATTERN = /\b(?:rgba?|hsla?)\(/;

function collectFiles(dir: string): string[] {
    const entries = readdirSync(dir);
    const files: string[] = [];

    for (const entry of entries) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...collectFiles(full));
        } else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) {
            files.push(full);
        }
    }

    return files;
}

function toPosix(path: string): string {
    return relative(ROOT, path).split(sep).join('/');
}

describe('guard hardcoded color', () => {
    it('layer UI bebas dari hex dan rgba/hsla literal', () => {
        const violations: string[] = [];

        for (const dir of SCAN_DIRS) {
            for (const file of collectFiles(join(ROOT, dir))) {
                const relPath = toPosix(file);
                const lines = readFileSync(file, 'utf8').split('\n');

                lines.forEach((line, index) => {
                    const trimmed = line.trim();
                    if (!HEX_PATTERN.test(trimmed) && !COLOR_FN_PATTERN.test(trimmed)) return;

                    const allowed = ALLOWED_RULES.some(
                        (rule) => rule.file === relPath && rule.pattern.test(trimmed),
                    );
                    if (allowed) return;

                    violations.push(`${relPath}:${index + 1} — ${trimmed}`);
                });
            }
        }

        expect(violations).toEqual([]);
    });

    it('setiap pengecualian masih relevan (baris yang diizinkan benar-benar ada)', () => {
        for (const rule of ALLOWED_RULES) {
            const content = readFileSync(join(ROOT, rule.file), 'utf8');
            const stillMatches = content
                .split('\n')
                .map((line) => line.trim())
                .some((line) => rule.pattern.test(line));

            expect({
                file: rule.file,
                reason: rule.reason,
                stillRelevant: stillMatches,
            }).toEqual({ file: rule.file, reason: rule.reason, stillRelevant: true });
        }
    });
});
