import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <svg width={100} height={100} viewBox="0 0 100 100">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>

            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="30%" stopColor="var(--color-one)" />
              <stop offset="70%" stopColor="var(--color-two)" />
            </linearGradient>

            <mask id="clipping">
              <rect width="100%" height="100%" fill="black" />
              <g filter="url(#goo)">
                <polygon points="25,25 75,25 50,75" fill="white" />
                <polygon points="50,25 75,75 25,75" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
                <polygon points="35,35 65,35 50,65" fill="white" />
              </g>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)" mask="url(#clipping)" />
        </svg>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  
  .loader {
    --color-one: #ffbf48;
    --color-two: #be4a1d;
    --color-three: #ffbf4780;
    --color-four: #bf4a1d80;
    --color-five: #ffbf4740;
    --time-animation: 6s;
    --size: 1; /* You can change the size */
    width: 100px;
    height: 100px;
    position: relative;
    border-radius: 50%;
    transform: scale(var(--size));
    box-shadow:
      0 0 25px 0 var(--color-three),
      0 20px 50px 0 var(--color-four);
    animation: colorize calc(var(--time-animation) * 3) ease-in-out infinite;
  }

  .loader::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border-top: solid 1px var(--color-one);
    border-bottom: solid 1px var(--color-two);
    background: linear-gradient(180deg, var(--color-five), var(--color-four));
    box-shadow:
      inset 0 10px 10px 0 var(--color-three),
      inset 0 -10px 10px 0 var(--color-four);
  }

  .loader .box {
    width: 100px;
    height: 100px;
    background: linear-gradient(
      180deg,
      var(--color-one) 30%,
      var(--color-two) 70%
    );
    mask: url(#clipping);
    -webkit-mask: url(#clipping);
  }

  .loader svg {
    position: absolute;
  }

  /* SVG Filter replaces the CSS properties */
  /* .loader svg #clipping { ... } rule removed */
  
  .loader svg #clipping polygon {
    /* Ensure transform-origin is relative to the SVG viewbox (0 0 100 100) */
    transform-box: view-box; 
  }

  /* Previously nth-child(2) */
  .loader svg #clipping polygon:nth-child(1) {
    transform-origin: 50px 50px;
    animation: rotation var(--time-animation) linear infinite reverse;
  }

  /* Previously nth-child(3) */
  .loader svg #clipping polygon:nth-child(2) {
    transform-origin: 50px 60px;
    animation: rotation var(--time-animation) linear infinite;
    animation-delay: calc(var(--time-animation) / -3);
  }

  /* Previously nth-child(4) */
  .loader svg #clipping polygon:nth-child(3) {
    transform-origin: 40px 40px;
    animation: rotation var(--time-animation) linear infinite reverse;
  }

  /* Previously nth-child(5) */
  .loader svg #clipping polygon:nth-child(4) {
    transform-origin: 40px 40px;
    animation: rotation var(--time-animation) linear infinite reverse;
    animation-delay: calc(var(--time-animation) / -2);
  }

  /* Previously nth-child(6) */
  .loader svg #clipping polygon:nth-child(5) {
    transform-origin: 60px 40px;
    animation: rotation var(--time-animation) linear infinite;
  }

  /* Previously nth-child(7) */
  .loader svg #clipping polygon:nth-child(6) {
    transform-origin: 60px 40px;
    animation: rotation var(--time-animation) linear infinite;
    animation-delay: calc(var(--time-animation) / -1.5);
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Note: roundness animation removed as it's hard to replicate dynamically with SVG filters in CSS cheaply. 
     The gooey effect itself provides enough organic feel. */

  @keyframes colorize {
    0% {
      filter: hue-rotate(190deg); /* Blue */
    }
    20% {
      filter: hue-rotate(220deg); /* Navy */
    }
    40% {
      filter: hue-rotate(240deg); /* Dark Blue */
    }
    60% {
      filter: hue-rotate(-100deg); /* Purple/Pinkish */
    }
    85% {
      filter: hue-rotate(0deg); /* Orange */
    }
    100% {
      filter: hue-rotate(190deg); /* Back to Blue - Skip Red/Green/Yellow */
    }
  }`;

export default Loader;
