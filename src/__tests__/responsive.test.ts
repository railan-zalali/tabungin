import { getResponsiveGridColumns, resolveWidthClass } from '../utils/responsiveHelpers';

describe('responsive helpers', () => {
  it('maps width breakpoints to stable width classes', () => {
    expect(resolveWidthClass(360)).toBe('compact');
    expect(resolveWidthClass(420)).toBe('regular');
    expect(resolveWidthClass(719)).toBe('regular');
    expect(resolveWidthClass(720)).toBe('wide');
  });

  it('keeps grid columns conservative on small widths', () => {
    expect(getResponsiveGridColumns(320)).toBe(1);
    expect(getResponsiveGridColumns(343)).toBe(1);
    expect(getResponsiveGridColumns(344)).toBe(2);
    expect(getResponsiveGridColumns(360)).toBe(2);
    expect(getResponsiveGridColumns(560)).toBe(2);
  });
});
