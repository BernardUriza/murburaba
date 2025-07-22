import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';

describe('AudioPlayer - Critical TDD Tests', () => {
  beforeEach(() => {
    // Simple mock for getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 200,
      bottom: 20,
      width: 200,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render disabled state when no src provided', () => {
      render(<AudioPlayer label="Test Audio" />);
      
      const button = screen.getByRole('button', { name: /test audio/i });
      expect(button).toBeDisabled();
      expect(screen.getByText('Test Audio - No audio')).toBeInTheDocument();
    });

    it('should render enabled state with src', () => {
      render(<AudioPlayer src="test.mp3" label="Test Audio" />);
      
      const button = screen.getByRole('button', { name: /test audio/i });
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AudioPlayer src="test.mp3" label="Test" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Props and Configuration', () => {
    it('should handle volume prop', () => {
      render(
        <AudioPlayer 
          src="test.mp3" 
          label="Test" 
          volume={0.5}
        />
      );
      
      const audio = document.querySelector('audio');
      expect(audio).toHaveAttribute('src', 'test.mp3');
    });

    it('should handle muted prop', () => {
      render(
        <AudioPlayer 
          src="test.mp3" 
          label="Test" 
          muted={true}
        />
      );
      
      const audio = document.querySelector('audio');
      expect(audio).toHaveAttribute('src', 'test.mp3');
    });

    it('should handle disabled prop', () => {
      render(
        <AudioPlayer 
          src="test.mp3" 
          label="Test" 
          disabled={true}
        />
      );
      
      const button = screen.getByRole('button', { name: /test/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for play state', () => {
      render(<AudioPlayer src="test.mp3" label="Test Audio" />);
      
      const button = screen.getByRole('button', { name: /test audio.*play audio/i });
      expect(button).toHaveAttribute('aria-label', 'Test Audio - Play audio');
    });

    it('should support custom aria-label', () => {
      render(
        <AudioPlayer 
          src="test.mp3" 
          label="Test" 
          aria-label="Custom audio control"
        />
      );
      
      const button = screen.getByRole('button', { name: /custom audio control/i });
      expect(button).toHaveAttribute('aria-label', 'Custom audio control');
    });

    it('should have proper region role', () => {
      render(<AudioPlayer src="test.mp3" label="Test Audio" />);
      
      const region = screen.getByRole('region', { name: 'Audio player for Test Audio' });
      expect(region).toBeInTheDocument();
    });

    it('should have progress slider with proper attributes', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const slider = screen.getByRole('slider', { name: 'Seek position' });
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '0');
      expect(slider).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('Time Formatting', () => {
    it('should show initial time as 0:00', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // The time is displayed as "0:00 / 0:00" in a single element
      expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
    });

    it('should handle time display format', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const timeDisplay = screen.getByText('0:00 / 0:00');
      expect(timeDisplay).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with 0% initially', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const progressFill = document.querySelector('.audio-player__progress-fill');
      expect(progressFill).toHaveStyle('width: 0%');
    });

    it('should handle progress bar click without crashing', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const progressBar = document.querySelector('.audio-player__progress-bar');
      if (progressBar) {
        expect(() => {
          fireEvent.click(progressBar, { clientX: 100 });
        }).not.toThrow();
      }
    });
  });

  describe('Button States', () => {
    it('should show play icon initially', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      expect(screen.getByText('▶️')).toBeInTheDocument();
    });

    it('should handle button click without crashing', () => {
      const mockOnPlayStateChange = vi.fn();
      
      render(
        <AudioPlayer 
          src="test.mp3" 
          label="Test" 
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      const button = screen.getByRole('button');
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });

    it('should support keyboard interaction', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(() => {
        fireEvent.keyDown(button, { key: 'Enter' });
      }).not.toThrow();
      
      expect(() => {
        fireEvent.keyDown(button, { key: ' ' });
      }).not.toThrow();
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount without errors', () => {
      const { unmount } = render(<AudioPlayer src="test.mp3" label="Test" />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle src changes', () => {
      const { rerender } = render(<AudioPlayer src="test1.mp3" label="Test" />);
      
      expect(() => {
        rerender(<AudioPlayer src="test2.mp3" label="Test" />);
      }).not.toThrow();
    });

    it('should handle forceStop prop changes', () => {
      const { rerender } = render(
        <AudioPlayer src="test.mp3" label="Test" forceStop={false} />
      );
      
      expect(() => {
        rerender(<AudioPlayer src="test.mp3" label="Test" forceStop={true} />);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label gracefully', () => {
      render(<AudioPlayer src="test.mp3" label="" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle invalid volume values', () => {
      expect(() => {
        render(<AudioPlayer src="test.mp3" label="Test" volume={-1} />);
      }).not.toThrow();
      
      expect(() => {
        render(<AudioPlayer src="test.mp3" label="Test" volume={2} />);
      }).not.toThrow();
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(
        <AudioPlayer src="test1.mp3" label="Test1" volume={0.5} />
      );
      
      expect(() => {
        rerender(<AudioPlayer src="test2.mp3" label="Test2" volume={0.8} />);
        rerender(<AudioPlayer src="test3.mp3" label="Test3" volume={0.3} />);
      }).not.toThrow();
    });
  });
});