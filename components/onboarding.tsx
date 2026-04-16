'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Explore the world easily',
    subtitle: 'To your desire',
    icon: '🛵',
  },
  {
    id: 2,
    title: 'Reach the unknown spot',
    subtitle: 'To your destination',
    icon: '🏃',
  },
  {
    id: 3,
    title: 'Make connects with explora',
    subtitle: 'To your dream trip',
    icon: '🌿',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 sm:mb-12">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full"></div>
            <span className="text-white text-sm sm:text-base font-medium">
              (Community)
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Carousel */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-center">
          {/* Featured Slide */}
          <div className="w-full lg:w-2/5 flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 sm:p-10 w-full max-w-sm h-80 sm:h-96 flex flex-col justify-between text-white">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Explora</h2>
              </div>
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-4">{slide.icon}</div>
                <p className="text-base sm:text-lg font-medium">{slide.title}</p>
              </div>
            </div>
          </div>

          {/* Slides Grid */}
          <div className="w-full lg:w-3/5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {slides.map((s, index) => (
              <div
                key={s.id}
                className={`bg-white rounded-2xl p-6 sm:p-8 cursor-pointer transition-all transform hover:scale-105 ${
                  index === currentSlide ? 'ring-2 ring-blue-500 scale-105' : ''
                }`}
                onClick={() => setCurrentSlide(index)}
              >
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{s.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                  {s.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
                  {s.subtitle}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        className={`h-1 w-1 rounded-full transition-all ${
                          dot === index % 3
                            ? 'bg-blue-500 w-3'
                            : 'bg-gray-300'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(index);
                      handleNext();
                    }}
                    className="bg-gray-900 text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mt-8 sm:mt-12">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-blue-500 w-8'
                  : 'bg-gray-600 w-2 hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
