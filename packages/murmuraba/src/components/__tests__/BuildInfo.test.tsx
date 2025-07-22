import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  BuildInfo, 
  BuildInfoBadge, 
  BuildInfoBlock, 
  BuildInfoInline,
  getPackageVersion,
  formatBuildDate
} from '../BuildInfo';

describe('BuildInfo TDD Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<BuildInfo />);

      const buildInfo = screen.getByRole('status');
      expect(buildInfo).toBeInTheDocument();
      expect(buildInfo).toHaveClass('murmuraba-build-info');
    });

    it('should display version with prefix by default', () => {
      render(<BuildInfo version="2.1.0" />);

      expect(screen.getByText('v2.1.0')).toBeInTheDocument();
    });

    it('should display version without prefix when showPrefix is false', () => {
      render(<BuildInfo version="2.1.0" showPrefix={false} />);

      expect(screen.getByText('2.1.0')).toBeInTheDocument();
      expect(screen.queryByText('v2.1.0')).not.toBeInTheDocument();
    });

    it('should display build date', () => {
      render(<BuildInfo buildDate="2024-01-15" />);

      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    });

    it('should use current date as default when no buildDate provided', () => {
      const today = new Date().toLocaleDateString();
      render(<BuildInfo />);

      expect(screen.getByText(today)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BuildInfo className="custom-build-info" />
      );

      expect(container.firstChild).toHaveClass('murmuraba-build-info');
      expect(container.firstChild).toHaveClass('custom-build-info');
    });

    it('should set proper aria-label for accessibility', () => {
      render(
        <BuildInfo
          version="1.2.3"
          buildDate="2024-01-15"
          aria-label="Custom build information"
        />
      );

      const buildInfo = screen.getByRole('status');
      expect(buildInfo).toHaveAttribute('aria-label', 'Custom build information');
    });

    it('should generate default aria-label when not provided', () => {
      render(
        <BuildInfo
          version="1.2.3"
          buildDate="2024-01-15"
        />
      );

      const buildInfo = screen.getByRole('status');
      expect(buildInfo).toHaveAttribute('aria-label', 'Build information: Version 1.2.3, built on 1/15/2024');
    });
  });

  describe('Format Variants', () => {
    it('should render inline format by default', () => {
      const { container } = render(
        <BuildInfo version="1.0.0" buildDate="2024-01-01" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--inline');
      expect(buildInfo.style.display).toBe('inline-flex');
    });

    it('should render block format correctly', () => {
      const { container } = render(
        <BuildInfo version="1.0.0" buildDate="2024-01-01" format="block" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--block');
      expect(buildInfo.style.display).toBe('block');
    });

    it('should render badge format correctly', () => {
      const { container } = render(
        <BuildInfo version="1.0.0" buildDate="2024-01-01" format="badge" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--badge');
      expect(buildInfo.style.backgroundColor).toBeTruthy();
      expect(buildInfo.style.border).toBeTruthy();
      expect(buildInfo.style.borderRadius).toBe('12px');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      const { container } = render(
        <BuildInfo size="small" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--small');
      expect(buildInfo.style.fontSize).toBe('0.75rem');
    });

    it('should apply medium size styles by default', () => {
      const { container } = render(
        <BuildInfo />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--medium');
      expect(buildInfo.style.fontSize).toBe('0.875rem');
    });

    it('should apply large size styles', () => {
      const { container } = render(
        <BuildInfo size="large" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--large');
      expect(buildInfo.style.fontSize).toBe('1rem');
    });

    it('should adjust badge size accordingly', () => {
      const { container } = render(
        <BuildInfo format="badge" size="small" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo.style.fontSize).toBe('0.6875rem');
      expect(buildInfo.style.padding).toBe('0.25rem 0.5rem');
    });
  });

  describe('Theme Variants', () => {
    it('should apply auto theme by default', () => {
      const { container } = render(
        <BuildInfo />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--auto');
      expect(buildInfo.style.color).toBe('var(--text-secondary, #4a5568)');
    });

    it('should apply light theme styles', () => {
      const { container } = render(
        <BuildInfo theme="light" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--light');
      expect(buildInfo.style.color).toBe('#4a5568');
    });

    it('should apply dark theme styles', () => {
      const { container } = render(
        <BuildInfo theme="dark" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--dark');
      expect(buildInfo.style.color).toBe('#a0aec0');
    });

    it('should apply dark theme to badge format', () => {
      const { container } = render(
        <BuildInfo format="badge" theme="dark" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo.style.backgroundColor).toBe('#2d3748');
      expect(buildInfo.style.border).toBe('1px solid #4a5568');
    });

    it('should apply light theme to badge format', () => {
      const { container } = render(
        <BuildInfo format="badge" theme="light" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo.style.backgroundColor).toBe('#f7fafc');
      expect(buildInfo.style.border).toBe('1px solid #e2e8f0');
    });
  });

  describe('Separator Handling', () => {
    it('should display default separator', () => {
      render(<BuildInfo version="1.0.0" buildDate="2024-01-01" />);

      const separator = screen.getByText('•');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveAttribute('aria-hidden', 'true');
    });

    it('should display custom separator', () => {
      render(
        <BuildInfo
          version="1.0.0"
          buildDate="2024-01-01"
          separator=" | "
        />
      );

      expect(screen.getByText('|')).toBeInTheDocument();
    });

    it('should not display separator when set to empty string', () => {
      render(
        <BuildInfo
          version="1.0.0"
          buildDate="2024-01-01"
          separator=""
        />
      );

      expect(screen.queryByText('•')).not.toBeInTheDocument();
    });

    it('should not display separator in block format', () => {
      render(
        <BuildInfo
          version="1.0.0"
          buildDate="2024-01-01"
          format="block"
        />
      );

      expect(screen.queryByText('•')).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format ISO date string correctly', () => {
      render(<BuildInfo buildDate="2024-12-25T10:30:00Z" />);

      expect(screen.getByText('12/25/2024')).toBeInTheDocument();
    });

    it('should handle invalid date strings gracefully', () => {
      render(<BuildInfo buildDate="invalid-date" />);

      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });

    it('should handle already formatted date strings', () => {
      render(<BuildInfo buildDate="Jan 15, 2024" />);

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    });
  });

  describe('Block Format Structure', () => {
    it('should render version and date in separate divs for block format', () => {
      const { container } = render(
        <BuildInfo
          version="1.0.0"
          buildDate="2024-01-01"
          format="block"
        />
      );

      const buildInfo = container.firstChild as HTMLElement;
      const children = buildInfo.children;
      
      expect(children).toHaveLength(2);
      expect(children[0]).toHaveTextContent('v1.0.0');
      expect(children[1]).toHaveTextContent('1/1/2024');
    });
  });

  describe('CSS Classes', () => {
    it('should apply all relevant CSS classes', () => {
      const { container } = render(
        <BuildInfo
          format="badge"
          size="large"
          theme="dark"
          className="custom-class"
        />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass(
        'murmuraba-build-info',
        'murmuraba-build-info--badge',
        'murmuraba-build-info--large',
        'murmuraba-build-info--dark',
        'custom-class'
      );
    });

    it('should add semantic CSS classes to child elements', () => {
      render(<BuildInfo version="1.0.0" buildDate="2024-01-01" />);

      expect(screen.getByText('v1.0.0')).toHaveClass('murmuraba-build-info__version');
      expect(screen.getByText('•')).toHaveClass('murmuraba-build-info__separator');
      expect(screen.getByText('1/1/2024')).toHaveClass('murmuraba-build-info__date');
    });
  });

  describe('Pre-configured Variants', () => {
    it('should render BuildInfoBadge correctly', () => {
      const { container } = render(
        <BuildInfoBadge version="1.0.0" buildDate="2024-01-01" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--badge');
    });

    it('should render BuildInfoBlock correctly', () => {
      const { container } = render(
        <BuildInfoBlock version="1.0.0" buildDate="2024-01-01" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--block');
    });

    it('should render BuildInfoInline correctly', () => {
      const { container } = render(
        <BuildInfoInline version="1.0.0" buildDate="2024-01-01" />
      );

      const buildInfo = container.firstChild as HTMLElement;
      expect(buildInfo).toHaveClass('murmuraba-build-info--inline');
    });

    it('should pass through props to pre-configured variants', () => {
      render(
        <BuildInfoBadge
          version="2.0.0"
          size="large"
          theme="dark"
          className="custom-badge"
        />
      );

      const buildInfo = screen.getByRole('status');
      expect(buildInfo).toHaveClass('custom-badge');
      expect(buildInfo).toHaveClass('murmuraba-build-info--large');
      expect(buildInfo).toHaveClass('murmuraba-build-info--dark');
      expect(screen.getByText('v2.0.0')).toBeInTheDocument();
    });
  });

  describe('Utility Functions', () => {
    describe('getPackageVersion', () => {
      it('should return version from process.env.PACKAGE_VERSION', () => {
        const originalVersion = process.env.PACKAGE_VERSION;
        process.env.PACKAGE_VERSION = '2.5.0';

        expect(getPackageVersion()).toBe('2.5.0');

        process.env.PACKAGE_VERSION = originalVersion;
      });

      it('should return default version when PACKAGE_VERSION is not set', () => {
        const originalVersion = process.env.PACKAGE_VERSION;
        delete process.env.PACKAGE_VERSION;

        expect(getPackageVersion()).toBe('1.0.0');

        process.env.PACKAGE_VERSION = originalVersion;
      });

      it('should handle errors gracefully', () => {
        expect(getPackageVersion()).toBe('1.0.0');
      });
    });

    describe('formatBuildDate', () => {
      it('should format Date object correctly', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        const formatted = formatBuildDate(date);

        expect(formatted).toMatch(/Jan 15, 2024/);
      });

      it('should format date string correctly', () => {
        const formatted = formatBuildDate('2024-12-25');

        expect(formatted).toMatch(/Dec 25, 2024/);
      });

      it('should handle invalid dates gracefully', () => {
        const formatted = formatBuildDate('invalid-date');

        expect(formatted).toMatch(/\w+ \d+, \d{4}/); // Should return current date format
      });

      it('should handle undefined/null gracefully', () => {
        const formatted = formatBuildDate(null as any);

        expect(formatted).toMatch(/\w+ \d+, \d{4}/); // Should return current date format
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty version string', () => {
      render(<BuildInfo version="" />);

      expect(screen.getByText('v')).toBeInTheDocument();
    });

    it('should handle empty buildDate string', () => {
      render(<BuildInfo buildDate="" />);

      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should handle very long version strings', () => {
      const longVersion = '1.2.3-beta.4+build.12345678901234567890';
      render(<BuildInfo version={longVersion} />);

      expect(screen.getByText(`v${longVersion}`)).toBeInTheDocument();
    });

    it('should handle very long date strings', () => {
      const longDate = 'This is a very long date string that might cause layout issues';
      render(<BuildInfo buildDate={longDate} />);

      expect(screen.getByText(longDate)).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount cleanly without errors', () => {
      const { unmount } = render(
        <BuildInfo version="1.0.0" buildDate="2024-01-01" />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle prop changes without errors', () => {
      const { rerender } = render(
        <BuildInfo version="1.0.0" buildDate="2024-01-01" />
      );

      expect(() => {
        rerender(
          <BuildInfo
            version="2.0.0"
            buildDate="2024-12-31"
            format="badge"
            size="large"
            theme="dark"
          />
        );
      }).not.toThrow();
    });
  });
});