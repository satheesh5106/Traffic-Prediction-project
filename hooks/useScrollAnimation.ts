'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const useScrollAnimation = () => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      gsap.from(element, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse'
        }
      });
    }, element);

    return () => ctx.revert();
  }, []);

  return elementRef;
};

export const useCounterAnimation = (target: number, duration: number = 2) => {
  const countRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = countRef.current;
    if (!element) return;

    const obj = { value: 0 };
    
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        value: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = Math.round(obj.value).toLocaleString();
        },
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          once: true
        }
      });
    }, element);

    return () => ctx.revert();
  }, [target, duration]);

  return countRef;
};