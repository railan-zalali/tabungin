// Guard: setiap nama icon literal di src/ harus benar-benar ada di glyphMap
// MaterialCommunityIcons. Nama yang salah tetap lolos typecheck dan test lain
// (komponen tetap dirender, ikonnya saja kosong + ada warning runtime), jadi
// dicek khusus di sini.
import fs from 'fs';
import path from 'path';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const glyphMap = MaterialCommunityIcons.glyphMap as Record<string, number>;

/** Prop yang selalu bermakna nama ikon MCI, di mana pun dipakai. */
const ICON_PROPS = /\b(?:icon|leftIcon|rightIcon)="([a-z0-9-]+)"/g;
/** Semua atribut name="..." — divalidasi hanya bila milik <MaterialCommunityIcons>. */
const NAME_ATTR = /\bname="([a-z0-9-]+)"/g;
const MCI_ELEMENT = 'MaterialCommunityIcons';

function walk(dir: string): string[] {
    const found: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name)) found.push(full);
    }
    return found;
}

/** Index '>' penutup tag yang dibuka di tagStart (mengabaikan > di dalam string). */
function findTagEnd(source: string, tagStart: number): number {
    let quote: string | null = null;
    for (let i = tagStart; i < source.length; i += 1) {
        const char = source[i];
        if (quote) {
            if (char === quote) quote = null;
        } else if (char === '"' || char === "'" || char === '{') {
            quote = char === '{' ? null : char;
        } else if (char === '>') {
            return i;
        }
    }
    return -1;
}

/** Nama elemen pembuka yang membawakan atribut name di posisi tersebut. */
function owningTag(source: string, nameIndex: number): string | null {
    const tagStart = source.lastIndexOf('<', nameIndex);
    if (tagStart < 0) return null;
    const tag = /^<([A-Za-z][A-Za-z0-9.]*)/.exec(source.slice(tagStart, tagStart + 80));
    if (!tag) return null;
    return findTagEnd(source, tagStart) > nameIndex ? tag[1] : null;
}

/** @returns daftar "[nama] -> file, file" untuk nama icon yang tidak valid. */
function collectInvalidNames(): string[] {
    const invalid = new Map<string, Set<string>>();

    const record = (name: string, file: string) => {
        const files = invalid.get(name) ?? new Set<string>();
        files.add(file);
        invalid.set(name, files);
    };

    for (const file of walk(SRC)) {
        const relative = path.relative(ROOT, file).split(path.sep).join('/');
        const source = fs.readFileSync(file, 'utf8');

        ICON_PROPS.lastIndex = 0;
        let prop: RegExpExecArray | null;
        while ((prop = ICON_PROPS.exec(source))) {
            if (!glyphMap[prop[1]]) record(prop[1], relative);
        }

        NAME_ATTR.lastIndex = 0;
        let attr: RegExpExecArray | null;
        while ((attr = NAME_ATTR.exec(source))) {
            if (owningTag(source, attr.index) !== MCI_ELEMENT) continue;
            if (!glyphMap[attr[1]]) record(attr[1], relative);
        }
    }

    return [...invalid.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, files]) => `"${name}" -> ${[...files].join(', ')}`);
}

describe('nama icon literal di src/', () => {
    it('semua ada di glyphMap MaterialCommunityIcons', () => {
        expect(collectInvalidNames()).toEqual([]);
    });

    it('scan-nya benar-benar membaca icon (bukan map kosong)', () => {
        // Kalau regex-nya salah tempat, jumlahnya bisa jatuh ke ~0 dan test pertama
        // ikut lulus palsu — jadi pastikan ada banyak nama icon yang terbaca.
        let total = 0;
        for (const file of walk(SRC)) {
            const source = fs.readFileSync(file, 'utf8');
            ICON_PROPS.lastIndex = 0;
            while (ICON_PROPS.exec(source)) total += 1;
        }
        expect(total).toBeGreaterThan(20);
    });
});
