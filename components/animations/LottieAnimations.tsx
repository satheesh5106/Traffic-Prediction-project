'use client';
import Lottie from 'lottie-react';

// Success Checkmark Animation
export const successAnimation = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "nm": "Success Checkmark",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Checkmark",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [100, 100, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "i": { "x": [0.667], "y": [1] }, "o": { "x": [0.333], "y": [0] }, "t": 0, "s": [0] },
            { "t": 30, "s": [100] }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ind": 0,
              "ty": "sh",
              "ks": {
                "a": 1,
                "k": [
                  {
                    "i": { "x": 0.667, "y": 1 },
                    "o": { "x": 0.333, "y": 0 },
                    "t": 15,
                    "s": [{
                      "i": [[0, 0], [0, 0], [0, 0]],
                      "o": [[0, 0], [0, 0], [0, 0]],
                      "v": [[-30, 0], [-10, 20], [30, -20]],
                      "c": false
                    }]
                  },
                  {
                    "t": 45,
                    "s": [{
                      "i": [[0, 0], [0, 0], [0, 0]],
                      "o": [[0, 0], [0, 0], [0, 0]],
                      "v": [[-30, 0], [-10, 20], [30, -20]],
                      "c": false
                    }]
                  }
                ]
              }
            },
            {
              "ty": "st",
              "c": { "a": 0, "k": [0.2, 0.8, 0.2, 1] },
              "o": { "a": 0, "k": 100 },
              "w": { "a": 0, "k": 8 },
              "lc": 2,
              "lj": 2
            },
            {
              "ty": "tr",
              "p": { "a": 0, "k": [0, 0] },
              "a": { "a": 0, "k": [0, 0] },
              "s": { "a": 0, "k": [100, 100] },
              "r": { "a": 0, "k": 0 },
              "o": { "a": 0, "k": 100 }
            }
          ]
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ]
};

// Loading Spinner Animation
export const loadingAnimation = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 100,
  "h": 100,
  "nm": "Loading Spinner",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Spinner",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": {
          "a": 1,
          "k": [
            { "i": { "x": [0.667], "y": [1] }, "o": { "x": [0.333], "y": [0] }, "t": 0, "s": [0] },
            { "t": 60, "s": [360] }
          ]
        },
        "p": { "a": 0, "k": [50, 50, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": { "a": 0, "k": [100, 100, 100] }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "d": 1,
              "ty": "el",
              "s": { "a": 0, "k": [40, 40] },
              "p": { "a": 0, "k": [0, 0] }
            },
            {
              "ty": "st",
              "c": { "a": 0, "k": [0.3, 0.6, 1, 1] },
              "o": { "a": 0, "k": 100 },
              "w": { "a": 0, "k": 4 },
              "lc": 2,
              "lj": 2,
              "d": [
                { "n": "d", "nm": "dash", "v": { "a": 0, "k": 20 } },
                { "n": "g", "nm": "gap", "v": { "a": 0, "k": 10 } }
              ]
            },
            {
              "ty": "tr",
              "p": { "a": 0, "k": [0, 0] },
              "a": { "a": 0, "k": [0, 0] },
              "s": { "a": 0, "k": [100, 100] },
              "r": { "a": 0, "k": 0 },
              "o": { "a": 0, "k": 100 }
            }
          ]
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ]
};

// Error Animation
export const errorAnimation = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "nm": "Error X",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "X Mark",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [100, 100, 0] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "i": { "x": [0.667], "y": [1] }, "o": { "x": [0.333], "y": [0] }, "t": 0, "s": [0] },
            { "t": 30, "s": [100] }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ind": 0,
              "ty": "sh",
              "ks": {
                "a": 0,
                "k": {
                  "i": [[0, 0], [0, 0], [0, 0], [0, 0]],
                  "o": [[0, 0], [0, 0], [0, 0], [0, 0]],
                  "v": [[-20, -20], [20, 20], [20, 20], [-20, -20]],
                  "c": false
                }
              }
            },
            {
              "ind": 1,
              "ty": "sh",
              "ks": {
                "a": 0,
                "k": {
                  "i": [[0, 0], [0, 0], [0, 0], [0, 0]],
                  "o": [[0, 0], [0, 0], [0, 0], [0, 0]],
                  "v": [[20, -20], [-20, 20], [-20, 20], [20, -20]],
                  "c": false
                }
              }
            },
            {
              "ty": "st",
              "c": { "a": 0, "k": [0.9, 0.2, 0.2, 1] },
              "o": { "a": 0, "k": 100 },
              "w": { "a": 0, "k": 8 },
              "lc": 2,
              "lj": 2
            },
            {
              "ty": "tr",
              "p": { "a": 0, "k": [0, 0] },
              "a": { "a": 0, "k": [0, 0] },
              "s": { "a": 0, "k": [100, 100] },
              "r": { "a": 0, "k": 0 },
              "o": { "a": 0, "k": 100 }
            }
          ]
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ]
};

// Component exports
export const SuccessAnimation = ({ className = "w-24 h-24" }: { className?: string }) => (
  <div className={className}>
    <Lottie animationData={successAnimation} loop={false} />
  </div>
);

export const LoadingAnimation = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={className}>
    <Lottie animationData={loadingAnimation} loop={true} />
  </div>
);

export const ErrorAnimation = ({ className = "w-16 h-16" }: { className?: string }) => (
  <div className={className}>
    <Lottie animationData={errorAnimation} loop={false} />
  </div>
);