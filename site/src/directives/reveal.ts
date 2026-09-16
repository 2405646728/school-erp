import type { Directive, DirectiveBinding } from 'vue';

/**
 * 滚动入场指令：元素进入视口时淡入上移，避免长页面内容生硬地一次性出现。
 * 用法：<section v-reveal> 或 <section v-reveal="'120ms'">（自定义延迟）
 *
 * 主路径使用 IntersectionObserver；部分嵌入式浏览器或未渲染的后台标签页不会派发
 * 观察回调，因此附加一层「有界兜底」：滚动事件 + 前 20 秒内每 350ms 检查一次，
 * 元素一旦显示即停止监听，保证内容在任何环境下都不会被永久隐藏。
 */
let observer: IntersectionObserver | null = null;
const cleanups = new WeakMap<HTMLElement, () => void>();

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
          cleanups.get(entry.target as HTMLElement)?.();
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );
  return observer;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const vReveal: Directive<HTMLElement, string | undefined> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | undefined>) {
    // 不支持观察器或用户要求减少动效时，直接展示，不做隐藏
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      el.classList.add('reveal', 'is-visible');
      return;
    }

    el.classList.add('reveal');
    if (binding.value) el.style.transitionDelay = binding.value;
    getObserver().observe(el);

    let intervalId = 0;
    let timeoutId = 0;

    const cleanup = () => {
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      intervalId = 0;
      timeoutId = 0;
    };

    function check() {
      if (el.classList.contains('is-visible')) {
        cleanup();
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 40 && rect.bottom > 0) {
        el.classList.add('is-visible');
        observer?.unobserve(el);
        cleanup();
      }
    }

    // 有界兜底：滚动/尺寸变化时立即检查，并在 20 秒内周期性检查
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(check, 350);
    }, 350);
    timeoutId = window.setTimeout(cleanup, 20000);

    cleanups.set(el, cleanup);
  },
  unmounted(el: HTMLElement) {
    cleanups.get(el)?.();
    cleanups.delete(el);
    observer?.unobserve(el);
  },
};
