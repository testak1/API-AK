import Head from 'next/head';
import Link from 'next/link';

export default function APISalesPage() {
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

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">AK-Tuning API</Link>
          <div className="hidden md:flex gap-8">
            <Link href="#features" className="text-slate-700 hover:text-blue-600 transition">Features</Link>
            <Link href="#pricing" className="text-slate-700 hover:text-blue-600 transition">Pricing</Link>
            <Link href="#docs" className="text-slate-700 hover:text-blue-600 transition">Documentation</Link>
            <Link href="#contact" className="text-slate-700 hover:text-blue-600 transition">Contact</Link>
          </div>
          <Link href="#pricing" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Get Started
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-extrabold mb-6">Premium Vehicle Tuning Data API</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Access comprehensive vehicle tuning data including performance specs, compatibility, and pricing through our powerful API.
          </p>
          <Link href="#pricing" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition">
            View Pricing Plans
          </Link>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:-translate-y-2 transition">
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-white py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">Simple, Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`border rounded-xl p-8 ${plan.popular ? 'border-2 border-blue-600 relative' : 'border-slate-200'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 right-6 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-5xl font-bold my-6">
                    {plan.price}
                    <span className="text-base font-normal text-slate-500">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <span className="text-blue-600 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link 
                    href={plan.ctaLink} 
                    className={`block text-center py-3 px-6 rounded-lg font-medium ${
                      plan.popular 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    } transition`}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to integrate our API?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Start building with AK-Tuning API today and get your first 100 requests free.
          </p>
          <Link href="#" className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition">
            Get API Key
          </Link>
        </section>
      </main>

      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div>
            <h3 className="text-xl mb-6">AK-Tuning API</h3>
            <p className="text-slate-400">Premium vehicle tuning data API for developers and businesses.</p>
          </div>
          {/* Footer columns */}
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="text-xl mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link, i) => (
                  <li key={i}>
                    <Link href={link.url} className="text-slate-400 hover:text-white transition">
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-4 pt-12 mt-12 border-t border-slate-800 text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} AK-Tuning. All rights reserved.</p>
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
    description: 'Get up-to-date tuning information for thousands of vehicle models.'
  },
  // Add other features...
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$99',
    period: 'month',
    features: [
      '1,000 API requests/month',
      'Basic vehicle data',
      'Email support'
    ],
    ctaText: 'Get Started',
    ctaLink: '#',
    popular: false
  },
  // Add other plans...
];

const footerLinks = [
  {
    title: 'Product',
    links: [
      { text: 'Features', url: '#features' },
      // Add other links...
    ]
  },
  // Add other columns...
];
