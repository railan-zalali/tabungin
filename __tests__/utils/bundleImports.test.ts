// Guard bundle (P3-04 / §6.2 roadmap).
//
// Dua barrel ini otomatis menyeret aset besar saat diimpor utuh:
//   * '@expo/vector-icons'          -> 19 font ikon, ±3,9 MB
//   * '@expo-google-fonts/<paket>'  -> seluruh bobot + italic, ±2,3 MB
// App hanya boleh mengakses jalur yang sudah dipangkas: ikon lewat shim di
// src/lib/vectorIcons.ts (dipasang metro.config.js), font lewat impor per bobot.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const ALLOWED_ICON_SETS = ['MaterialCommunityIcons'];

function sourceFiles(): string[] {
    const files: string[] = [];

    const scan = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) scan(full);
            else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
        }
    };

    scan(path.join(ROOT, 'src'));
    files.push(path.join(ROOT, 'App.tsx'));

    return files;
}

function relative(file: string): string {
    return path.relative(ROOT, file).split(path.sep).join('/');
}

describe('guard bundle (P3-04)', () => {
    const files = sourceFiles();

    it('membaca file sumber yang benar', () => {
        expect(files.length).toBeGreaterThan(30);
        expect(files.some((file) => file.endsWith('App.tsx'))).toBe(true);
    });

    it('hanya mengimpor MaterialCommunityIcons dari @expo/vector-icons', () => {
        const namedImport = /import\s*\{([^}]*)\}\s*from\s*['"]@expo\/vector-icons['"]/g;
        const otherUsage =
            /(?:import\s+[\w*]+\s+from\s*|require\(\s*|import\s*)['"]@expo\/vector-icons['"]/g;
        const failures: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');

            for (const match of content.matchAll(namedImport)) {
                const names = (match[1] ?? '')
                    .split(',')
                    .map((name) => name.trim().split(/\s+as\s+/)[0])
                    .filter(Boolean);
                for (const name of names) {
                    if (!ALLOWED_ICON_SETS.includes(name)) {
                        failures.push(`${relative(file)}: set ikon '${name}' tidak di-bundle`);
                    }
                }
            }

            // Bentuk lain (default/named berbeda/side-effect) tidak disediakan shim.
            const stripped = content.replace(namedImport, '');
            for (const match of stripped.matchAll(otherUsage)) {
                failures.push(`${relative(file)}: '${match[0]}' — pakai { ${ALLOWED_ICON_SETS.join(', ')} }`);
            }
        }

        expect(failures).toEqual([]);
    });

    it('mengimpor font Google per bobot, bukan dari barrel paketnya', () => {
        const googleFontImport = /(?:from\s+|require\(\s*)['"](@expo-google-fonts\/[^'"]+)['"]/g;
        const failures: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            for (const match of content.matchAll(googleFontImport)) {
                const specifier = match[1] ?? '';
                // '@expo-google-fonts/dm-sans' = barrel; harus ada subpath bobot.
                if (!specifier.replace(/^@expo-google-fonts\//, '').includes('/')) {
                    failures.push(`${relative(file)}: '${specifier}' menarik seluruh varian font`);
                }
            }
        }

        expect(failures).toEqual([]);
    });
});
