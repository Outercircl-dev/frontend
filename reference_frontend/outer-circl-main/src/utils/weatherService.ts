interface WeatherData {
  condition: string;
  temperature: number;
  description: string;
  icon: string;
}

interface EventPreparationTips {
  weatherTips: string[];
  generalTips: string[];
  categorySpecific: string[];
}

/**
 * Gets weather-appropriate advice for events
 * This is a simplified version - in production you'd integrate with a real weather API
 */
export const getEventPreparationAdvice = (
  eventCategory: string = 'social',
  eventTime?: string,
  location?: string
): EventPreparationTips => {
  // Mock weather data - in production, fetch from OpenWeatherMap or similar
  const mockWeather = getMockWeatherData(location);
  
  const weatherTips = getWeatherTips(mockWeather);
  const generalTips = getGeneralPreparationTips(eventTime);
  const categorySpecific = getCategorySpecificTips(eventCategory);

  return {
    weatherTips,
    generalTips,
    categorySpecific
  };
};

const getMockWeatherData = (location?: string): WeatherData => {
  // In production, this would make an API call to a weather service
  // For now, return reasonable mock data
  const conditions = ['sunny', 'cloudy', 'rainy', 'partly-cloudy'];
  const temperatures = [18, 22, 25, 28]; // Celsius
  
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
  
  return {
    condition: randomCondition,
    temperature: randomTemp,
    description: getWeatherDescription(randomCondition, randomTemp),
    icon: getWeatherIcon(randomCondition)
  };
};

const getWeatherTips = (weather: WeatherData): string[] => {
  const tips = [];
  
  if (weather.condition === 'rainy') {
    tips.push('🌧️ Bring an umbrella or rain jacket');
    tips.push('💧 Consider waterproof shoes');
  } else if (weather.condition === 'sunny') {
    tips.push('☀️ Don\'t forget sunscreen and a hat');
    tips.push('💧 Bring extra water to stay hydrated');
  } else if (weather.temperature > 25) {
    tips.push('🌡️ It\'s warm today - dress in light, breathable clothing');
  } else if (weather.temperature < 15) {
    tips.push('❄️ Bundle up - it\'s chilly today!');
    tips.push('🧥 Consider bringing an extra layer');
  }
  
  return tips;
};

const getGeneralPreparationTips = (eventTime?: string): string[] => {
  const tips = [];
  
  if (eventTime) {
    const hour = parseInt(eventTime.split(':')[0]);
    
    if (hour < 9) {
      tips.push('⏰ Early start - set multiple alarms!');
      tips.push('☕ Consider grabbing coffee on the way');
    } else if (hour > 19) {
      tips.push('🌆 Evening event - check transport options');
      tips.push('🔦 Bring a small flashlight if outdoors');
    }
  }
  
  tips.push('📱 Charge your phone fully');
  tips.push('💵 Bring some cash just in case');
  tips.push('🚗 Check parking or transport ahead of time');
  
  return tips;
};

const getCategorySpecificTips = (category: string): string[] => {
  const tipMap: Record<string, string[]> = {
    sports: [
      '👟 Wear comfortable athletic shoes',
      '🥤 Bring a water bottle',
      '👕 Dress in activewear you can move in',
      '🏃‍♂️ Do a quick warm-up beforehand'
    ],
    social: [
      '😊 Bring your best smile and open mind',
      '🎵 Think of some conversation starters',
      '📱 Make sure you can find the group easily',
      '🤝 Be ready to exchange contact info with new friends'
    ],
    food: [
      '🍽️ Don\'t eat too much beforehand',
      '💳 Check if it\'s cash or card payment',
      '🚫 Note any dietary restrictions',
      '📸 Camera ready for food pics!'
    ],
    outdoor: [
      '🦟 Bring insect repellent',
      '🧴 Pack sunscreen',
      '👟 Wear sturdy, comfortable shoes',
      '🎒 Bring a small backpack for essentials'
    ],
    creative: [
      '🎨 Wear clothes you don\'t mind getting messy',
      '📱 Bring inspiration photos if relevant',
      '🤲 Keep hands and nails clean',
      '✨ Come with an open, creative mindset'
    ],
    learning: [
      '📝 Bring a notepad and pen',
      '🧠 Come well-rested and focused',
      '❓ Prepare some questions in advance',
      '📚 Review any pre-reading materials'
    ]
  };
  
  return tipMap[category] || tipMap.social;
};

const getWeatherDescription = (condition: string, temperature: number): string => {
  const tempDesc = temperature > 25 ? 'warm' : temperature < 15 ? 'cool' : 'mild';
  return `${condition} and ${tempDesc} (${temperature}°C)`;
};

const getWeatherIcon = (condition: string): string => {
  const iconMap: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    'partly-cloudy': '⛅'
  };
  
  return iconMap[condition] || '🌤️';
};

export const formatPreparationTips = (tips: EventPreparationTips): string => {
  const allTips = [
    ...tips.weatherTips,
    ...tips.generalTips,
    ...tips.categorySpecific.slice(0, 2) // Limit category tips to avoid overwhelming
  ];
  
  return allTips.slice(0, 6).map(tip => `• ${tip}`).join('\n');
};