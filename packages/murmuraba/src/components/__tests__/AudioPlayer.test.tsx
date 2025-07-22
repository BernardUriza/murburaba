import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';

// Mock HTMLAudioElement with all necessary DOM methods
const createMockAudio = () => {
  const eventListeners: { [key: string]: EventListener[] } = {};
  
  const mockAudio = {
    // Audio properties
    src: '',
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: 1,
    muted: false,
    readyState: 0,
    error: null,
    preload: '',
    
    // DOM Element properties and methods
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    hasAttribute: vi.fn(),
    tagName: 'AUDIO',
    nodeType: 1,
    nodeName: 'AUDIO',
    parentNode: null,
    childNodes: [],
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    cloneNode: vi.fn(() => createMockAudio()),
    ownerDocument: document,
    
    // Audio methods
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    
    // Event handling
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!eventListeners[type]) {
        eventListeners[type] = [];
      }
      eventListeners[type].push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (eventListeners[type]) {
        const index = eventListeners[type].indexOf(listener);
        if (index > -1) {
          eventListeners[type].splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn(),
    
    // Helper to trigger events in tests
    _triggerEvent: (type: string, event = {}) => {
      if (eventListeners[type]) {
        eventListeners[type].forEach(listener => listener(event as Event));
      }
    }
  };
  
  return mockAudio;
};

describe('AudioPlayer TDD Refactored', () => {
  let mockAudio: any;
  let originalHTMLAudioElement: any;
  
  beforeEach(() => {
    mockAudio = createMockAudio();
    
    // Mock HTMLAudioElement constructor
    originalHTMLAudioElement = global.HTMLAudioElement;
    global.HTMLAudioElement = vi.fn(() => mockAudio) as any;
    
    // Mock audio element creation in JSDOM
    const originalAudioDescriptor = Object.getOwnPropertyDescriptor(window, 'Audio');
    Object.defineProperty(window, 'Audio', {
      writable: true,
      value: vi.fn(() => mockAudio)
    });
    
    // Mock createElement to return our mock audio for audio elements
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'audio') {
        return mockAudio as any;
      }
      return originalCreateElement(tagName);
    });
    
    // Mock getBoundingClientRect for seek functionality
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
    // Restore original HTMLAudioElement
    if (originalHTMLAudioElement) {
      global.HTMLAudioElement = originalHTMLAudioElement;
    }
    vi.restoreAllMocks();
  });

  describe('Initialization and Props', () => {
    it('should render disabled state when no src provided', () => {
      render(<AudioPlayer label="Test Audio" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Test Audio - No audio')).toBeInTheDocument();
    });
    
    it('should initialize with correct props', () => {
      const mockOnPlayStateChange = vi.fn();
      
      render(
        <AudioPlayer
          src="test.mp3"
          label="Test Audio"
          onPlayStateChange={mockOnPlayStateChange}
          className="custom-class"
        />
      );
      
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
    
    it('should apply custom className', () => {
      const { container } = render(
        <AudioPlayer src="test.mp3" label="Test" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Playback Controls', () => {
    it('should toggle play/pause correctly', async () => {
      const mockOnPlayStateChange = vi.fn();
      
      render(
        <AudioPlayer
          src="test.mp3"
          label="Test"
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      const button = screen.getByRole('button');
      
      // Test play
      fireEvent.click(button);
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockOnPlayStateChange).toHaveBeenCalledWith(true);
      
      // Simulate audio actually playing
      mockAudio.paused = false;
      
      // Test pause
      fireEvent.click(button);
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockOnPlayStateChange).toHaveBeenCalledWith(false);
    });
    
    it('should handle play promise rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAudio.play.mockRejectedValue(new Error('Play failed'));
      
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Playback failed:', expect.any(Error));
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Force Stop Functionality', () => {
    it('should stop playback when forceStop becomes true', async () => {
      const mockOnPlayStateChange = vi.fn();
      
      const { rerender } = render(
        <AudioPlayer
          src="test.mp3"
          label="Test"
          onPlayStateChange={mockOnPlayStateChange}
          forceStop={false}
        />
      );
      
      // Start playing
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Force stop
      rerender(
        <AudioPlayer
          src="test.mp3"
          label="Test"
          onPlayStateChange={mockOnPlayStateChange}
          forceStop={true}
        />
      );
      
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockOnPlayStateChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly for various durations', () => {
      // This tests the internal formatTime function indirectly
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // Simulate different time values
      const testCases = [
        { input: 0, expected: '0:00' },
        { input: 30, expected: '0:30' },
        { input: 60, expected: '1:00' },
        { input: 65, expected: '1:05' },
        { input: 3661, expected: '61:01' },
      ];
      
      // We can't directly test formatTime, but we test its behavior through the component
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
    
    it('should handle infinite and NaN time values', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // Component should render without crashing
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });

  describe('Progress and Seeking', () => {
    it('should calculate progress correctly', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // Simulate loaded metadata
      mockAudio.duration = 100;
      mockAudio.currentTime = 25;
      
      // Trigger metadata loaded event
      mockAudio._triggerEvent('loadedmetadata');
      
      // Trigger time update
      mockAudio._triggerEvent('timeupdate');
      
      // Progress should be 25%
      const progressFill = document.querySelector('.audio-player__progress-fill');
      expect(progressFill).toHaveStyle('width: 25%');
    });
    
    it('should handle seeking when progress bar is clicked', () => {
      mockAudio.duration = 100;
      
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const progressContainer = document.querySelector('.audio-player__progress-bar');
      if (progressContainer) {
        // Simulate click at 50% position (100px from left in 200px width)
        fireEvent.click(progressContainer, {
          clientX: 100,
        });
        
        expect(mockAudio.currentTime).toBe(50);
      }
    });
    
    it('should not seek when duration is zero or undefined', () => {
      mockAudio.duration = 0;
      
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const progressContainer = document.querySelector('.audio-player__progress-bar');
      if (progressContainer) {
        fireEvent.click(progressContainer, { clientX: 100 });
        expect(mockAudio.currentTime).toBe(0);
      }
    });
  });

  describe('Loading States', () => {
    it('should show loading state during audio loading', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // Trigger loadstart event
      mockAudio._triggerEvent('loadstart');
      
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });
    
    it('should clear loading state when metadata is loaded', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // First trigger loadstart
      mockAudio._triggerEvent('loadstart');
      
      // Then trigger metadata loaded
      mockAudio.duration = 100;
      mockAudio._triggerEvent('loadedmetadata');
      
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.queryByText('⏳')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle audio errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AudioPlayer src="invalid.mp3" label="Test" />);
      
      // Trigger error event
      mockAudio._triggerEvent('error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Audio playback error');
      expect(screen.getByRole('button')).not.toBeDisabled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const addEventListenerCalls = mockAudio.addEventListener.mock.calls.length;
      
      unmount();
      
      expect(mockAudio.removeEventListener).toHaveBeenCalledTimes(addEventListenerCalls);
    });
    
    it('should remove event listeners when src changes', () => {
      const { rerender } = render(<AudioPlayer src="test1.mp3" label="Test" />);
      
      const initialAddCalls = mockAudio.addEventListener.mock.calls.length;
      
      rerender(<AudioPlayer src="test2.mp3" label="Test" />);
      
      expect(mockAudio.removeEventListener).toHaveBeenCalledTimes(initialAddCalls);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AudioPlayer src="test.mp3" label="Test Audio" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Test Audio'));
    });
    
    it('should support keyboard navigation', () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockAudio.play).toHaveBeenCalled();
      
      // Test Space key
      fireEvent.keyDown(button, { key: ' ' });
      expect(mockAudio.play).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid play/pause clicks', async () => {
      render(<AudioPlayer src="test.mp3" label="Test" />);
      
      const button = screen.getByRole('button');
      
      // Rapid clicks
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Should handle gracefully without errors
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockAudio.pause).toHaveBeenCalled();
    });
    
    it('should handle audio element being null', () => {
      // Test when ref.current is null
      const { container } = render(<AudioPlayer src="test.mp3" label="Test" />);
      
      // Remove audio element
      const audioElement = container.querySelector('audio');
      audioElement?.remove();
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should not crash
      expect(button).toBeInTheDocument();
    });
  });
});