import React, { useEffect } from 'react';
// @ts-ignore
import NProgress from 'nprogress';
import { useLoading } from '../context/LoadingContext';

// Inject basic NProgress styling so it doesn't require a separate CSS import
const nprogressStyles = `
#nprogress {
  pointer-events: none;
}
#nprogress .bar {
  background: #10b981;
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
}
#nprogress .peg {
  display: block;
  position: absolute;
  right: 0px;
  width: 100px;
  height: 100%;
  box-shadow: 0 0 10px #10b981, 0 0 5px #10b981;
  opacity: 1.0;
  transform: rotate(3deg) translate(0px, -4px);
}
`;

export const ProgressBarOverlay: React.FC = () => {
  const { isLoading } = useLoading();

  useEffect(() => {
    // Inject style tag if not present
    if (!document.getElementById('nprogress-custom-style')) {
      const style = document.createElement('style');
      style.id = 'nprogress-custom-style';
      style.innerHTML = nprogressStyles;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isLoading]);

  return null;
};
