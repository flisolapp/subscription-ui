import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollService } from './scroll-service';

describe('ScrollService', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('should scroll to top with smooth behavior', () => {
    ScrollService.toTop();

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });
});
