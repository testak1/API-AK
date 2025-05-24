import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function APISalesPage() {
  const [activeTab, setActiveTab] = useState<'features' | 'pricing' | 'demo'>('features');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoResponse, setDemoResponse] = useState(null);

  const handleTryDemo = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDemoResponse({
        success: true,
        data: {
          brand: "Volkswagen",
          model: "Golf R",
          year: "2022",
          stages: [
            {
              name: "Stage 1",
              origHk: 320,
              tunedHk: 380,
              price: 4995
            }
          ]
        }
      });
    } catch (error) {
      setDemoResponse({
        success: false,
        error: "Failed to fetch demo data"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AK-Tuning API | Premium Vehicle Tuning Data API</title>
        <meta name="description" content="Purchase premium vehicle tuning data API for your automotive business. Real-time performance specs, pricing, and compatibility data." />
        <meta name="keywords" content="vehicle API, tuning data, car performance API, automotive data, ECU tuning API" />
        <meta property="og:title" content="AK-Tuning API - Premium Vehicle Tuning Data" />
        <meta property="og:description" content="Access comprehensive vehicle tuning data through our powerful API" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://api.aktuning.se" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://api.aktuning.se" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebAPI",
            "name": "AK-Tuning Vehicle Tuning API",
            "description": "Comprehensive API for vehicle tuning data including performance specs, compatibility, and pricing information.",
            "termsOfService": "https://api.aktuning.se/terms",
            "documentation": "https://docs.aktuning.se",
            "provider": {
              "@type": "Organization",
              "name": "AK-Tuning",
              "url": "https://aktuning.se"
            }
          })}
        </script>
      </Head>

      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AK-Tuning API</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => setActiveTab('features')}
              className={`font-medium ${activeTab === 'features' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'} transition`}
            >
              Features
            </button>
            <button 
              onClick={() => setActiveTab('pricing')}
              className={`font-medium ${activeTab === 'pricing' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'} transition`}
            >
              Pricing
            </button>
            <button 
              onClick={() => setActiveTab('demo')}
              className={`font-medium ${activeTab === 'demo' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'} transition`}
            >
              Live Demo
            </button>
            <Link 
              href="#contact" 
              className="font-medium text-gray-600 hover:text-blue-600 transition"
            >
              Contact
            </Link>
          </div>
          
          <Link 
            href="#pricing" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Vehicle Tuning Data API
              </span>
              <br />
              For Developers & Businesses
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Access comprehensive vehicle tuning data including performance specs, compatibility, and pricing through our powerful REST API.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="#pricing" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
              >
                View Pricing Plans
              </Link>
              <button 
                onClick={() => setActiveTab('demo')}
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Try Live Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features/Demo/Pricing Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12 border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('features')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'features' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Key Features
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'pricing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Pricing Plans
              </button>
              <button
                onClick={() => setActiveTab('demo')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'demo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Live Demo
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-8">
            {activeTab === 'features' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-2xl mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="grid md:grid-cols-3 gap-8">
                {pricingPlans.map((plan, index) => (
                  <div 
                    key={index} 
                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border ${
                      plan.popular ? 'border-2 border-blue-600 relative' : 'border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 right-6 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                        Most Popular
                      </div>
                    )}
                    <div className="p-8">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-4xl font-bold my-6">
                        {plan.price}
                        <span className="text-base font-normal text-gray-500 ml-1">/{plan.period}</span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start">
                            <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={plan.ctaLink}
                        className={`block text-center py-3 px-6 rounded-lg font-medium ${
                          plan.popular
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } transition shadow-sm`}
                      >
                        {plan.ctaText}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'demo' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid md:grid-cols-2">
                  <div className="p-8">
                    <h3 className="text-2xl font-bold mb-6">Try Our API Live</h3>
                    <p className="text-gray-600 mb-6">
                      Enter your API key or use our demo key to test the API endpoints in real-time.
                    </p>
                    
                    <div className="mb-6">
                      <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="text"
                        id="api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key or use 'demo'"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleTryDemo}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-70"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </span>
                      ) : (
                        "Send Test Request"
                      )}
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 p-8 border-t md:border-t-0 md:border-l border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-700">API Response</h4>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">GET</span>
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">/api/v1/vehicle</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-auto">
                      {demoResponse ? (
                        <pre className="text-green-400 text-sm">
                          {JSON.stringify(demoResponse, null, 2)}
                        </pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          {isLoading ? (
                            <span className="animate-pulse">Waiting for response...</span>
                          ) : (
                            "Send a request to see the API response"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to integrate our API?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Start building with AK-Tuning API today and get your first 100 requests free.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="#pricing" 
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
              >
                View Pricing Plans
              </Link>
              <Link 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

        {/* Documentation Preview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Documentation</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our detailed documentation makes integration simple with code examples in multiple languages.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8">
                <h3 className="text-xl font-bold mb-4">API Endpoints</h3>
                <ul className="space-y-4">
                  <li>
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-3 mt-1">GET</span>
                      <div>
                        <code className="text-sm font-mono text-gray-800">/api/v1/vehicles</code>
                        <p className="text-gray-600 text-sm mt-1">List all available vehicles</p>
                      </div>
                    </div>
                  </li>
                  {/* Add more endpoints */}
                </ul>
              </div>
              
              <div className="bg-gray-900 p-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-300 font-medium">Example Request</h4>
                  <div className="flex space-x-2">
                    <button className="text-xs text-gray-400 hover:text-white">JavaScript</button>
                    <button className="text-xs text-gray-400 hover:text-white">Python</button>
                    <button className="text-xs text-gray-400 hover:text-white">cURL</button>
                  </div>
                </div>
                
                <pre className="text-green-400 text-sm overflow-auto">
                  {`fetch('https://api.aktuning.se/api/v1/vehicles', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-12">
          <div>
            <h3 className="text-xl font-bold mb-6">AK-Tuning API</h3>
            <p className="text-gray-400">Premium vehicle tuning data API for developers and businesses.</p>
          </div>
          
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link, i) => (
                  <li key={i}>
                    <Link href={link.url} className="text-gray-400 hover:text-white transition">
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} AK-Tuning. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white transition">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </Link>
              {/* Add other social icons */}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// Data
const features = [
  {
    icon: '⚡',
    title: 'Real-time Data',
    description: 'Get up-to-date tuning information for thousands of vehicle models with our constantly updated database.'
  },
  {
    icon: '🔧',
    title: 'Comprehensive Specs',
    description: 'Detailed performance data including horsepower, torque, and stage tuning information for each vehicle.'
  },
  {
    icon: '📊',
    title: 'Analytics Ready',
    description: 'Structured JSON responses that integrate seamlessly with your applications and analytics tools.'
  },
  {
    icon: '🔒',
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with 99.9% uptime guarantee and automatic scaling.'
  },
  {
    icon: '🌐',
    title: 'Global Coverage',
    description: 'Data for vehicles from all major manufacturers worldwide with multi-language support.'
  },
  {
    icon: '📝',
    title: 'Excellent Documentation',
    description: 'Comprehensive documentation with code samples in multiple programming languages.'
  }
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$99',
    period: 'month',
    features: [
      '1,000 API requests/month',
      'Basic vehicle data',
      'Email support',
      'Standard response times',
      'Community forum access'
    ],
    ctaText: 'Get Started',
    ctaLink: '#',
    popular: false
  },
  {
    name: 'Professional',
    price: '$299',
    period: 'month',
    features: [
      '10,000 API requests/month',
      'Full vehicle data including tuning specs',
      'Priority email support',
      'Faster response times',
      'Basic analytics dashboard',
      'Webhook support'
    ],
    ctaText: 'Get Started',
    ctaLink: '#',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'month',
    features: [
      'Unlimited API requests',
      'Full data access including beta features',
      '24/7 priority support',
      'Dedicated account manager',
      'Advanced analytics',
      'Custom integrations',
      'SLAs available'
    ],
    ctaText: 'Contact Sales',
    ctaLink: '#contact',
    popular: false
  }
];

const footerLinks = [
  {
    title: 'Product',
    links: [
      { text: 'Features', url: '#features' },
      { text: 'Pricing', url: '#pricing' },
      { text: 'Documentation', url: '#docs' },
      { text: 'Changelog', url: '#' },
      { text: 'Status', url: '#' }
    ]
  },
  {
    title: 'Company',
    links: [
      { text: 'About', url: '#' },
      { text: 'Blog', url: '#' },
      { text: 'Careers', url: '#' },
      { text: 'Contact', url: '#contact' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { text: 'Privacy', url: '#' },
      { text: 'Terms', url: '#' },
      { text: 'Security', url: '#' }
    ]
  }
];
