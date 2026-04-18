import { calculateResponsiveMetrics, getResponsiveGridColumns, resolveWidthClass } from '../utils/responsiveHelpers';

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

  it('switches native mobile layouts into compact density on short phones', () => {
    const metrics = calculateResponsiveMetrics({
      width: 393,
      height: 851,
      topInset: 24,
      bottomInset: 16,
      textScale: 1,
      platformOS: 'android',
    });

    expect(metrics.density).toBe('compact');
    expect(metrics.heroDensity).toBe('compact');
    expect(metrics.headerDensity).toBe('compact');
  });

  it('treats larger font scales on short native phones as short viewports', () => {
    const metrics = calculateResponsiveMetrics({
      width: 412,
      height: 820,
      topInset: 24,
      bottomInset: 16,
      textScale: 1.16,
      platformOS: 'android',
    });

    expect(metrics.isShortViewport).toBe(true);
    expect(metrics.compactBottomClearance).toBeGreaterThan(metrics.safeBottomSpacing);
  });

  it('keeps roomy tablet-like mobile heights in comfortable density', () => {
    const metrics = calculateResponsiveMetrics({
      width: 412,
      height: 915,
      topInset: 24,
      bottomInset: 16,
      textScale: 1,
      platformOS: 'android',
    });

    expect(metrics.density).toBe('comfortable');
    expect(metrics.headerDensity).toBe('compact');
  });
});
