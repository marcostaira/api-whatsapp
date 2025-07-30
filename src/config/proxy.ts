export const getBrowserConfig = () => {
  const browsers = [
    ["Chrome", "Windows", "110.0.0.0"],
    ["Firefox", "Linux", "109.0"],
    ["Safari", "macOS", "16.3"],
    ["Edge", "Windows", "110.0.0.0"],
    ["WhatsApp", "Desktop", "2.2409.2"],
  ];

  const randomBrowser = browsers[Math.floor(Math.random() * browsers.length)];
  return randomBrowser;
};

export const getRandomUserAgent = () => {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101",
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
};
